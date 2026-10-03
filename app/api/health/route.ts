import { db } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return json({ status: "ok", db: "up", time: new Date().toISOString() });
  } catch (err) {
    console.error("[health] database check failed", err);
    return json({ status: "error", db: "down", time: new Date().toISOString() }, 503);
  }
}
