import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Flame, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  channelLabel,
  formatChange,
  formatDate,
  formatNumber,
  formatPct,
  formatPeriod,
  sentimentLabel,
  SENTIMENT_LABELS,
} from "@/lib/format";
import type { Report, ReportQuote, Sentiment } from "@/lib/types";

/**
 * The Voice-of-Customer document. Every number comes from contentJson.stats; the narrative only
 * supplies prose. `print` swaps to dark-on-white with page breaks before major sections.
 */
export function ReportDocument({ report, print = false }: { report: Report; print?: boolean }) {
  const { stats, narrative } = report.contentJson;
  const quotesById = new Map<string, ReportQuote & { theme: string }>();
  for (const t of stats.topThemes) for (const q of t.candidateQuotes) quotesById.set(q.id, { ...q, theme: t.name });
  const quotes = narrative.quoteIds.flatMap((id) => (quotesById.has(id) ? [quotesById.get(id)!] : []));
  const themeName = new Map(stats.topThemes.map((t) => [t.themeId, t.name]));
  const highlight = new Map(narrative.themeHighlights.map((h) => [h.themeId, h.narrative]));

  const classified = stats.sentiment.POS.current + stats.sentiment.NEU.current + stats.sentiment.NEG.current;
  const pctNeg = classified ? (stats.sentiment.NEG.current / classified) * 100 : 0;
  const prevClassified = stats.sentiment.POS.previous + stats.sentiment.NEU.previous + stats.sentiment.NEG.previous;
  const prevPctNeg = prevClassified ? (stats.sentiment.NEG.previous / prevClassified) * 100 : 0;
  const topChannel = [...stats.channelMix].sort((a, b) => b.count - a.count)[0];

  const muted = print ? "text-zinc-600" : "text-muted-foreground";
  const rule = print ? "border-zinc-300" : "border-border";
  const section = cn("space-y-4", print && "break-before-page pt-2");
  const h2 = cn("font-display text-2xl font-bold tracking-tight sm:text-3xl", print && "text-zinc-900");
  const eyebrow = cn("font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em]", muted);

  return (
    <article className={cn("mx-auto max-w-3xl space-y-12", print ? "text-zinc-900" : "text-foreground")}>
      {/* Title block */}
      <header className={cn("space-y-5 border-b pb-8", rule)}>
        <p className={eyebrow}>
          Voice of Customer · {formatPeriod(stats.period.start, stats.period.end)}
        </p>
        <h1 className="display-wonk font-display text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl">
          {narrative.headline}
        </h1>
        <p className={cn("text-sm", muted)}>
          {report.title} · Generated {formatDate(report.createdAt)}
          {report.generatedBy ? ` by ${report.generatedBy.name}` : ""} · Compared with{" "}
          {formatPeriod(stats.previousPeriod.start, stats.previousPeriod.end)}
        </p>
      </header>

      <section aria-labelledby="exec" className="space-y-3">
        <h2 id="exec" className={eyebrow}>
          Executive summary
        </h2>
        <p className="whitespace-pre-line font-display text-xl font-light leading-relaxed sm:text-[1.45rem]">
          {narrative.executiveSummary}
        </p>
      </section>

      {/* Stat row: numbers only from stats */}
      <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-4", rule, print ? "bg-zinc-300" : "bg-border")}>
        <Stat print={print} label="Feedback" value={formatNumber(stats.totals.current)} delta={stats.totals.changePct} />
        <Stat
          print={print}
          label="Negative"
          value={formatPct(pctNeg)}
          note={`was ${formatPct(prevPctNeg)}`}
        />
        <Stat print={print} label="Spiking themes" value={formatNumber(stats.spikingThemes.length)} />
        <Stat
          print={print}
          label="Top channel"
          value={topChannel ? channelLabel(topChannel.channel) : "—"}
          note={topChannel ? `${formatPct(topChannel.pct)} of feedback` : undefined}
          small
        />
      </dl>

      {/* Top themes */}
      <section aria-labelledby="themes" className={section}>
        <h2 id="themes" className={h2}>
          Top themes
        </h2>
        <div className={cn("overflow-x-auto rounded-xl border", rule)}>
          <table className="w-full text-sm tabular">
            <thead>
              <tr className={cn("border-b text-left", rule)}>
                <th className={cn("px-4 py-2.5", eyebrow)}>Theme</th>
                <th className={cn("px-4 py-2.5 text-right", eyebrow)}>Items</th>
                <th className={cn("px-4 py-2.5 text-right", eyebrow)}>Previous</th>
                <th className={cn("px-4 py-2.5 text-right", eyebrow)}>Change</th>
              </tr>
            </thead>
            <tbody>
              {stats.topThemes.map((t) => (
                <tr key={t.themeId} className={cn("border-b align-top last:border-0", rule)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                      {t.name}
                      {t.isSpiking && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.68rem] font-semibold",
                            print ? "border-orange-400 text-orange-700" : "border-spike/40 bg-spike/15 text-spike",
                          )}
                        >
                          <Flame className="size-3" aria-hidden="true" />
                          Spiking
                        </span>
                      )}
                    </div>
                    {highlight.get(t.themeId) && <p className={cn("mt-1.5 max-w-prose leading-relaxed", muted)}>{highlight.get(t.themeId)}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatNumber(t.current)}</td>
                  <td className={cn("px-4 py-3 text-right font-mono", muted)}>{formatNumber(t.previous)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono">
                    <ChangeIcon pct={t.changePct} />
                    {formatChange(t.changePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sentiment shift */}
      <section aria-labelledby="shift" className="space-y-4">
        <h2 id="shift" className={h2}>
          Sentiment shift
        </h2>
        <p className="leading-relaxed">{narrative.sentimentShift}</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {(["POS", "NEU", "NEG"] as Sentiment[]).map((s) => {
            const d = stats.sentiment[s];
            return (
              <li key={s} className={cn("rounded-lg border p-3", rule)}>
                <p className={eyebrow}>{SENTIMENT_LABELS[s]}</p>
                <p className="mt-1 font-mono text-2xl tabular">{formatNumber(d.current)}</p>
                <p className={cn("font-mono text-xs tabular", muted)}>
                  <ChangeIcon pct={d.changePct} />
                  {formatChange(d.changePct)} vs {formatNumber(d.previous)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Quotes */}
      {quotes.length > 0 && (
        <section aria-labelledby="quotes" className={section}>
          <h2 id="quotes" className={h2}>
            In their words
          </h2>
          <div className="space-y-5">
            {quotes.map((q) => {
              const body = (
                <>
                  <Quote className={cn("mb-2 size-5", print ? "text-violet-700" : "text-primary")} aria-hidden="true" />
                  <p className="font-display text-lg italic leading-relaxed">&ldquo;{q.content}&rdquo;</p>
                  <footer className={cn("mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs", muted)}>
                    <span>{q.customerLabel ?? "Customer"}</span>
                    <span>{channelLabel(q.channel)}</span>
                    <span>{q.theme}</span>
                    {q.sentiment && <span>{sentimentLabel(q.sentiment)}</span>}
                  </footer>
                </>
              );
              return (
                <blockquote key={q.id} className={cn("break-inside-avoid border-l-2 pl-5", print ? "border-violet-700" : "border-primary")}>
                  {print ? (
                    body
                  ) : (
                    <Link
                      href={`/inbox?id=${encodeURIComponent(q.id)}`}
                      className="block rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {body}
                    </Link>
                  )}
                </blockquote>
              );
            })}
          </div>
        </section>
      )}

      {/* Actions */}
      <section aria-labelledby="actions" className={section}>
        <h2 id="actions" className={h2}>
          Recommended actions
        </h2>
        <ol className="space-y-5">
          {narrative.recommendedActions.map((a, i) => (
            <li key={i} className="flex break-inside-avoid gap-4">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold",
                  print ? "border border-zinc-900" : "bg-primary text-primary-foreground",
                )}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div className="space-y-1">
                <p className="text-[1.05rem] font-semibold leading-snug">{a.action}</p>
                <p className={cn("leading-relaxed", muted)}>{a.rationale}</p>
                {a.themeId && themeName.get(a.themeId) && (
                  <p className={cn("font-mono text-[0.7rem] uppercase tracking-wider", muted)}>Theme: {themeName.get(a.themeId)}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

function ChangeIcon({ pct }: { pct: number | null }) {
  const Icon = pct === null || pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : ArrowRight;
  return <Icon className="mr-0.5 inline size-3.5 align-[-2px]" aria-hidden="true" />;
}

function Stat({
  label,
  value,
  delta,
  note,
  small,
  print,
}: {
  label: string;
  value: string;
  delta?: number | null;
  note?: string;
  small?: boolean;
  print: boolean;
}) {
  return (
    <div className={cn("p-4", print ? "bg-white" : "bg-card")}>
      <dt className={cn("font-mono text-[0.7rem] uppercase tracking-[0.18em]", print ? "text-zinc-600" : "text-muted-foreground")}>{label}</dt>
      <dd className={cn("mt-2 font-mono tabular leading-none", small ? "text-lg" : "text-3xl")}>{value}</dd>
      {(delta !== undefined || note) && (
        <dd className={cn("mt-2 font-mono text-xs", print ? "text-zinc-600" : "text-muted-foreground")}>
          {delta !== undefined ? (
            <>
              <ChangeIcon pct={delta} />
              {formatChange(delta)} vs previous
            </>
          ) : (
            note
          )}
        </dd>
      )}
    </div>
  );
}
