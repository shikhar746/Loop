/**
 * Idempotent demo seed: deletes and recreates the "Acme Analytics" and "Globex" demo workspaces.
 * Run with `npm run seed` (prisma db seed → tsx prisma/seed.ts; Prisma loads .env for us).
 * Feedback is seeded PENDING. Run `npm run backfill` afterwards to classify + embed it.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateFeedback, mulberry32, pick, type SimTopic } from "../lib/simulator/templates";

const db = new PrismaClient();
const DAY_MS = 86_400_000;

const ACME = "Acme Analytics";
const GLOBEX = "Globex";
const DEMO_EMAILS = ["admin@loop.demo", "analyst@loop.demo", "viewer@loop.demo", "admin@globex.demo"];

const THEMES = [
  { name: "Onboarding", color: "#6366f1", description: "Signup, setup wizard, invites and first-run experience" },
  { name: "Billing", color: "#f43f5e", description: "Charges, invoices, refunds, pricing and payment methods" },
  { name: "Performance", color: "#f59e0b", description: "Slow pages, timeouts and responsiveness" },
  { name: "Mobile Experience", color: "#10b981", description: "iOS and Android app quality" },
  { name: "Integrations & SSO", color: "#0ea5e9", description: "Third-party connectors, webhooks, SAML/SCIM" },
  { name: "Reporting & Export", color: "#8b5cf6", description: "Reports, digests, CSV/PDF exports and sharing" },
];

// 150 items over the last 60 days. Billing spikes in the last 7 days; Onboarding has a cluster 9–13 days ago.
const ACME_PLAN: { topic: SimTopic; count: number; daysAgo: [number, number] }[] = [
  { topic: "Billing", count: 12, daysAgo: [8, 60] },
  { topic: "Billing", count: 20, daysAgo: [0, 6] },
  { topic: "Onboarding", count: 6, daysAgo: [15, 60] },
  { topic: "Onboarding", count: 10, daysAgo: [9, 13] },
  { topic: "Performance", count: 22, daysAgo: [0, 60] },
  { topic: "Mobile Experience", count: 20, daysAgo: [0, 60] },
  { topic: "Integrations & SSO", count: 20, daysAgo: [0, 60] },
  { topic: "Reporting & Export", count: 18, daysAgo: [0, 60] },
  { topic: "Praise", count: 22, daysAgo: [0, 60] },
];

function readSeedPassword(): string {
  const value = process.env.SEED_DEMO_PASSWORD;
  if (!value || /REPLACE|YOUR_/.test(value) || value.length < 8) {
    throw new Error(
      "SEED_DEMO_PASSWORD is missing, still a placeholder, or shorter than 8 characters. Set it in .env (demo-only password).",
    );
  }
  return value;
}

function randomDate(rng: () => number, now: number, [minDays, maxDays]: [number, number]): Date {
  const days = minDays + rng() * (maxDays - minDays + 1);
  return new Date(Math.min(now - 5 * 60_000, now - days * DAY_MS));
}

function statusFor(rng: () => number, createdAt: Date, now: number): Prisma.FeedbackCreateManyInput["status"] {
  if (now - createdAt.getTime() < 14 * DAY_MS) return "NEW";
  const r = rng();
  return r < 0.3 ? "REVIEWED" : r < 0.45 ? "ACTIONED" : "NEW";
}

async function main() {
  const password = readSeedPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const rng = mulberry32(20261003);
  const now = Date.now();

  // Idempotent reset: users first (emails are globally unique), then the demo workspaces (cascades the rest).
  await db.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } });
  await db.workspace.deleteMany({ where: { name: { in: [ACME, GLOBEX] } } });

  // Acme Analytics
  const acme = await db.workspace.create({ data: { name: ACME } });
  await db.user.createMany({
    data: [
      { name: "Avery Admin", email: "admin@loop.demo", role: "ADMIN", passwordHash, workspaceId: acme.id },
      { name: "Sam Analyst", email: "analyst@loop.demo", role: "ANALYST", passwordHash, workspaceId: acme.id },
      { name: "Vic Viewer", email: "viewer@loop.demo", role: "VIEWER", passwordHash, workspaceId: acme.id },
    ],
  });
  await db.theme.createMany({ data: THEMES.map((t) => ({ ...t, workspaceId: acme.id })) });

  const acmeFeedback: Prisma.FeedbackCreateManyInput[] = [];
  for (const slice of ACME_PLAN) {
    for (let i = 0; i < slice.count; i++) {
      const g = generateFeedback(rng, { topic: slice.topic });
      const createdAt = randomDate(rng, now, slice.daysAgo);
      acmeFeedback.push({
        workspaceId: acme.id,
        content: g.content,
        channel: g.channel,
        customerLabel: g.customerLabel,
        sourceRef: g.sourceRef,
        createdAt,
        status: statusFor(rng, createdAt, now),
        classificationStatus: "PENDING",
      });
    }
  }
  await db.feedback.createMany({ data: acmeFeedback });

  // Globex: small second tenant for isolation tests
  const globex = await db.workspace.create({ data: { name: GLOBEX } });
  await db.user.create({
    data: { name: "Gina Globex", email: "admin@globex.demo", role: "ADMIN", passwordHash, workspaceId: globex.id },
  });
  const topics: SimTopic[] = ["Billing", "Performance", "Mobile Experience", "Reporting & Export", "Praise"];
  await db.feedback.createMany({
    data: Array.from({ length: 10 }, () => {
      const g = generateFeedback(rng, { topic: pick(rng, topics) });
      return {
        workspaceId: globex.id,
        content: g.content,
        channel: g.channel,
        customerLabel: g.customerLabel,
        sourceRef: g.sourceRef,
        createdAt: randomDate(rng, now, [0, 30]),
        classificationStatus: "PENDING" as const,
      };
    }),
  });

  const byChannel = acmeFeedback.reduce<Record<string, number>>((acc, f) => {
    acc[f.channel] = (acc[f.channel] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Seeded "${ACME}" (${acme.id}): 3 users, ${THEMES.length} themes, ${acmeFeedback.length} feedback items`);
  console.log("  by channel:", byChannel);
  console.log(`Seeded "${GLOBEX}" (${globex.id}): 1 admin, 10 feedback items`);
  console.log("Logins: admin@loop.demo / analyst@loop.demo / viewer@loop.demo / admin@globex.demo (password = SEED_DEMO_PASSWORD)");
  console.log("Next: npm run backfill  (classifies + embeds all PENDING items)");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
