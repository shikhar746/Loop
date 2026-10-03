// Edge runtime: only a JWT check here. No Prisma, bcrypt or lib/* server modules.
// API routes enforce auth themselves via lib/guards.ts.
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

// App pages that require a signed-in user. Keep in sync with the frontend routes.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inbox/:path*",
    "/trends/:path*",
    "/feedback/:path*",
    "/themes/:path*",
    "/insights/:path*",
    "/ask/:path*",
    "/reports/:path*",
    "/members/:path*",
    "/settings/:path*",
  ],
};
