import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider, { type GoogleProfile } from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { env, googleAuthEnabled } from "./env";
import { loginSchema } from "./validators/auth";

export const BCRYPT_COST = 10;

// Compared against when the email doesn't exist, so response time doesn't reveal which emails are registered.
let dummyHash: string | undefined;
async function getDummyHash() {
  dummyHash ??= await bcrypt.hash("loop-timing-equalizer", BCRYPT_COST);
  return dummyHash;
}

export const authOptions: NextAuthOptions = {
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) {
          await bcrypt.compare(parsed.data.password, await getDummyHash());
          return null;
        }
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId };
      },
    }),
    // Optional: enabled when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
    ...(googleAuthEnabled
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
            // role/workspaceId are filled from the LOOP user in the jwt callback below.
            profile: (p: GoogleProfile) => ({
              id: p.sub,
              name: p.name,
              email: p.email,
              image: p.picture,
              role: "VIEWER" as const,
              workspaceId: "",
            }),
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      // Only verified Google addresses may sign in or claim an existing LOOP account with that email.
      const google = profile as GoogleProfile | undefined;
      if (!google?.email || !google.email_verified) return "/login?error=GoogleEmailUnverified";
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        // Map the Google identity onto a LOOP user (existing account by email, or a new workspace).
        const google = profile as GoogleProfile;
        const { findOrCreateGoogleUser } = await import("./services/members");
        const loopUser = await findOrCreateGoogleUser({ email: google.email, name: google.name ?? null });
        token.id = loopUser.id;
        token.sub = loopUser.id;
        token.role = loopUser.role;
        token.workspaceId = loopUser.workspaceId;
        return token;
      }
      // `user` is only present on sign-in; afterwards the token carries these claims.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && token.role && token.workspaceId) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.workspaceId = token.workspaceId;
      }
      return session;
    },
  },
};
