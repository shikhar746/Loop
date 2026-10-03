/**
 * Classifies + embeds every PENDING/FAILED feedback item, in batches of 8 with a short pause between
 * batches. Each FAILED item is retried at most once per run.
 *
 *   npm run backfill
 *
 * Runs with --conditions=react-server so lib/* modules' `import "server-only"` resolves outside Next.
 */
import { db } from "../lib/db";
import { PROCESS_BATCH_SIZE, processPending } from "../lib/services/feedback";

// Free-tier Gemini allows only a few requests per minute, so pause longer between batches there.
const PAUSE_MS = Number(process.env.BACKFILL_PAUSE_MS ?? (process.env.AI_PROVIDER === "gemini" ? 30_000 : 1_500));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const runStart = new Date();
  const workspaces = await db.workspace.findMany({
    where: { feedback: { some: { classificationStatus: { in: ["PENDING", "FAILED"] } } } },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  if (workspaces.length === 0) {
    console.log("Nothing to do: no PENDING or FAILED feedback.");
    return;
  }

  let totalOk = 0;
  let totalFailed = 0;
  for (const ws of workspaces) {
    console.log(`\n▶ ${ws.name} (${ws.id})`);
    let batch = 0;
    for (;;) {
      batch += 1;
      const started = Date.now();
      const { processed, failed, remaining } = await processPending(ws.id, runStart);
      totalOk += processed;
      totalFailed += failed;
      console.log(
        `  batch ${batch}: ${processed} done, ${failed} failed, ${remaining} remaining (${((Date.now() - started) / 1000).toFixed(1)}s)`,
      );
      if (remaining === 0 || processed + failed === 0) break;
      await sleep(PAUSE_MS);
    }
  }

  console.log(`\nFinished: ${totalOk} classified + embedded, ${totalFailed} failed (batch size ${PROCESS_BATCH_SIZE}).`);
  if (totalFailed > 0) {
    console.log("Failed items stay FAILED. Check the AI keys (GEMINI_API_KEY or ANTHROPIC_API_KEY, VOYAGE_API_KEY) and your connection, then re-run `npm run backfill`.");
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
