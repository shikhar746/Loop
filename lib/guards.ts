import "server-only";
import { getServerSession } from "next-auth";
import type { Role } from "@prisma/client";
import { authOptions } from "./auth";
import { db } from "./db";
import { forbidden, unauthenticated } from "./http";

export type SessionContext = {
  userId: string;
  workspaceId: string;
  role: Role;
  name: string;
  email: string;
};

export const ANALYST_UP: Role[] = ["ADMIN", "ANALYST"];

/**
 * Resolves the caller from the JWT, then re-reads the user from the DB on every request so
 * role changes and removals take effect immediately (the JWT alone could be up to 7 days stale).
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) throw unauthenticated();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, workspaceId: true, role: true, name: true, email: true },
  });
  if (!user) throw unauthenticated();

  return { userId: user.id, workspaceId: user.workspaceId, role: user.role, name: user.name, email: user.email };
}

export async function requireRole(...roles: Role[]): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!roles.includes(ctx.role)) throw forbidden();
  return ctx;
}
