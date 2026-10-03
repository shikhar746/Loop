import "server-only";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { env } from "./env";
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
  ],
  callbacks: {
    async jwt({ token, user }) {
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
