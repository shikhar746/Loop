import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, type Role } from "@prisma/client";
import { db } from "../db";
import { BCRYPT_COST } from "../auth";
import { AppError, conflict, notFound } from "../http";
import type { SignupInput } from "../validators/auth";
import type { CreateMemberInput, UpdateMemberInput } from "../validators/members";

const memberSelect = { id: true, name: true, email: true, role: true, createdAt: true } as const;
export type Member = Prisma.UserGetPayload<{ select: typeof memberSelect }>;

// Interactive transactions hold a pooled connection across round-trips; allow for a distant database.
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 } as const;

function isUniqueViolation(err: unknown) {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Public signup: a new workspace and its first ADMIN, created atomically. */
export async function signUp(input: SignupInput) {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (existing) throw conflict("An account with this email already exists.");

      const workspace = await tx.workspace.create({ data: { name: input.workspaceName } });
      const user = await tx.user.create({
        data: { name: input.name, email: input.email, passwordHash, role: "ADMIN", workspaceId: workspace.id },
        select: memberSelect,
      });
      return { user, workspace: { id: workspace.id, name: workspace.name } };
    }, TX_OPTIONS);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict("An account with this email already exists.");
    throw err;
  }
}

/**
 * Google sign-in (verified email only; the auth callback checks that).
 * - Email already registered → sign into that account, keeping its workspace and role.
 * - New email → create a workspace with this user as its ADMIN, like public signup.
 * Google-only users get an unguessable random password hash, so password login stays closed for them.
 */
export async function findOrCreateGoogleUser(input: { email: string; name: string | null }) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email }, select: { id: true, role: true, workspaceId: true } });
  if (existing) return { ...existing, isNew: false };

  const name = input.name?.trim().slice(0, 80) || email.split("@")[0];
  const firstName = name.split(/\s+/)[0];
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), BCRYPT_COST);
  try {
    const user = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({ data: { name: `${firstName}'s workspace`.slice(0, 80) } });
      return tx.user.create({
        data: { name, email, passwordHash, role: "ADMIN", workspaceId: workspace.id },
        select: { id: true, role: true, workspaceId: true },
      });
    }, TX_OPTIONS);
    return { ...user, isNew: true };
  } catch (err) {
    // Two first-time sign-ins racing: the other one created the user, so use it.
    if (isUniqueViolation(err)) {
      const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true, workspaceId: true } });
      if (user) return { ...user, isNew: false };
    }
    throw err;
  }
}

export async function getMe(workspaceId: string, userId: string) {
  const user = await db.user.findFirst({
    where: { id: userId, workspaceId },
    select: { ...memberSelect, workspace: { select: { id: true, name: true } } },
  });
  if (!user) throw notFound("User");
  return user;
}

export async function listMembers(workspaceId: string): Promise<Member[]> {
  return db.user.findMany({ where: { workspaceId }, select: memberSelect, orderBy: { createdAt: "asc" } });
}

export async function createMember(workspaceId: string, input: CreateMemberInput): Promise<Member> {
  const passwordHash = await bcrypt.hash(input.tempPassword, BCRYPT_COST);
  try {
    return await db.user.create({
      data: { name: input.name, email: input.email, role: input.role, passwordHash, workspaceId },
      select: memberSelect,
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict("A user with this email already exists.");
    throw err;
  }
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  input: UpdateMemberInput,
): Promise<Member> {
  return db.$transaction(
    async (tx) => {
      const member = await tx.user.findFirst({ where: { id: memberId, workspaceId }, select: memberSelect });
      if (!member) throw notFound("Member");

      if (member.role === "ADMIN" && input.role !== "ADMIN") {
        const admins = await tx.user.count({ where: { workspaceId, role: "ADMIN" } });
        if (admins <= 1) throw conflict("A workspace must keep at least one admin. Promote someone else first.");
      }
      return tx.user.update({ where: { id: member.id }, data: { role: input.role as Role }, select: memberSelect });
    },
    { ...TX_OPTIONS, isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function deleteMember(workspaceId: string, actingUserId: string, memberId: string): Promise<void> {
  if (memberId === actingUserId) {
    throw new AppError(409, "CONFLICT", "You can't remove yourself. Ask another admin to do it.");
  }
  const member = await db.user.findFirst({ where: { id: memberId, workspaceId }, select: { id: true } });
  if (!member) throw notFound("Member");
  await db.user.delete({ where: { id: member.id } });
}
