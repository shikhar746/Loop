"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Info, LoaderCircle, MessageCircleQuestion, RotateCw, Sparkles, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { ChannelLabel } from "@/components/app/channel-label";
import { PageHeader } from "@/components/app/page-header";
import { askLoop, toApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { formatDate, formatRatio } from "@/lib/format";
import type { AskCitation, AskResponse } from "@/lib/types";

const SUGGESTIONS = [
  "What are users saying about onboarding?",
  "Why are customers unhappy with billing?",
  "Which performance problems come up most often?",
  "What do customers love about the product?",
];

type Turn = {
  id: string;
  question: string;
  state: "pending" | "done" | "error";
  response?: AskResponse;
  error?: { message: string; ai: boolean };
};

/**
 * Maps [F3]-style markers to citation cards. The API returns citations in "cited" order but without
 * their [Fn] label, so markers are numbered by first appearance in the answer.
 * API-GAP: POST /api/insights/ask should return each citation's label (e.g. "F3") so markers map exactly.
 */
function markerMap(answer: string, citations: AskCitation[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of answer.matchAll(/\[F(\d+)\]/g)) {
    if (!map.has(m[1]) && map.size < citations.length) map.set(m[1], map.size);
  }
  return map;
}

export function AskView() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.state === "pending");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function run(id: string, question: string) {
    try {
      const response = await askLoop(question);
      setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, state: "done", response } : t)));
    } catch (err) {
      const e = toApiError(err);
      setTurns((ts) =>
        ts.map((t) =>
          t.id === id ? { ...t, state: "error", error: { message: e.status === 400 ? e.message : errorMessage(e), ai: e.status === 502 } } : t,
        ),
      );
    }
  }

  function ask(question: string) {
    const q = question.trim();
    if (q.length < 3) {
      setInputError("Ask a question of at least 3 characters.");
      return;
    }
    if (q.length > 500) {
      setInputError("Keep questions to 500 characters or fewer.");
      return;
    }
    setInputError(null);
    const id = `${Date.now()}`;
    setTurns((ts) => [...ts, { id, question: q, state: "pending" }]);
    setDraft("");
    void run(id, q);
  }

  function retry(turn: Turn) {
    setTurns((ts) => ts.map((t) => (t.id === turn.id ? { ...t, state: "pending", error: undefined } : t)));
    void run(turn.id, turn.question);
  }

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[32rem] flex-col gap-4 md:h-[calc(100dvh-5rem)]">
      <PageHeader
        eyebrow="AI3 · Ask LOOP"
        title="Ask LOOP"
        description="Questions answered only from your workspace's feedback, with the evidence cited."
      />

      <div className="surface flex min-h-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-8 p-4 sm:p-6" aria-live="polite" aria-relevant="additions text">
            {turns.length === 0 ? (
              <div className="reveal flex flex-col items-center gap-6 py-10 text-center" style={{ ["--i" as string]: 1 }}>
                <div className="grid size-14 place-items-center rounded-full border border-violet/40 bg-violet/15 shadow-[0_0_30px_-6px_hsl(var(--violet)/0.8)]">
                  <MessageCircleQuestion className="size-6 text-lavender" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="display-wonk font-display text-3xl font-black">What do you want to know?</p>
                  <p className="text-sm text-muted-foreground">Try one of these, or write your own below.</p>
                </div>
                <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      className="h-auto justify-start whitespace-normal py-3 text-left font-normal"
                      onClick={() => ask(s)}
                    >
                      <Sparkles className="text-primary" aria-hidden="true" />
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((t) => <TurnView key={t.id} turn={t} onRetry={() => retry(t)} />)
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <form
          className="border-t border-border bg-card p-3 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) ask(draft);
          }}
        >
          <Label htmlFor="ask-input" className="sr-only">
            Your question
          </Label>
          <div className="flex items-end gap-2">
            <Textarea
              id="ask-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!busy) ask(draft);
                }
              }}
              rows={2}
              maxLength={500}
              placeholder="Ask about your customers… (Enter to send, Shift+Enter for a new line)"
              className="max-h-40 min-h-[3rem] resize-none"
              aria-invalid={Boolean(inputError)}
              aria-describedby={inputError ? "ask-error" : undefined}
            />
            <Button type="submit" size="icon" className="size-12 shrink-0" disabled={busy || draft.trim().length === 0} aria-label="Send question">
              {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
            </Button>
          </div>
          {inputError && (
            <p id="ask-error" className="mt-2 text-xs text-destructive">
              {inputError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function TurnView({ turn, onRetry }: { turn: Turn; onRetry: () => void }) {
  return (
    <article className="space-y-3">
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-4 py-2.5 text-[0.95rem]">{turn.question}</p>
      </div>
      {turn.state === "pending" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Searching feedback…
        </p>
      )}
      {turn.state === "error" && turn.error && (
        <Alert variant={turn.error.ai ? "default" : "destructive"}>
          <TriangleAlert className="size-4" aria-hidden="true" />
          <AlertTitle>{turn.error.ai ? "AI is temporarily unavailable" : "That didn't work"}</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-muted-foreground">{turn.error.message}</span>
            <Button variant="outline" size="sm" onClick={onRetry} className="self-start">
              <RotateCw aria-hidden="true" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {turn.state === "done" && turn.response && <Answer turnId={turn.id} response={turn.response} />}
    </article>
  );
}

function Answer({ turnId, response }: { turnId: string; response: AskResponse }) {
  const [flash, setFlash] = useState<number | null>(null);

  if (response.insufficientEvidence) {
    return (
      <Alert>
        <Info className="size-4" aria-hidden="true" />
        <AlertTitle>Not enough matching feedback to answer that.</AlertTitle>
        <AlertDescription className="text-muted-foreground">Try rephrasing, or import more feedback first.</AlertDescription>
      </Alert>
    );
  }

  const map = markerMap(response.answer, response.citations);
  const parts = response.answer.split(/(\[F\d+\])/g);

  function jump(index: number) {
    const el = document.getElementById(`cite-${turnId}-${index}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    el.focus({ preventScroll: true });
    setFlash(null);
    requestAnimationFrame(() => setFlash(index));
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
          <Sparkles className="size-3.5" />
        </div>
        <p className="whitespace-pre-line text-[0.98rem] leading-relaxed text-foreground">
          {parts.map((part, i) => {
            const m = /^\[F(\d+)\]$/.exec(part);
            if (!m) return <Fragment key={i}>{part}</Fragment>;
            const index = map.get(m[1]);
            if (index === undefined) return null;
            return (
              <sup key={i} className="mx-0.5">
                <button
                  type="button"
                  onClick={() => jump(index)}
                  className="rounded bg-primary/15 px-1 font-mono text-[0.68rem] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Show source ${index + 1}`}
                >
                  {index + 1}
                </button>
              </sup>
            );
          })}
        </p>
      </div>

      <div className="space-y-2 sm:pl-10">
        <p className="eyebrow">
          Based on {response.citations.length} feedback item{response.citations.length === 1 ? "" : "s"}
        </p>
        <ol className="grid gap-2 md:grid-cols-2">
          {response.citations.map((c, i) => (
            <li key={c.id}>
              <Card
                id={`cite-${turnId}-${i}`}
                tabIndex={-1}
                className={cn("h-full p-3 outline-none transition-colors", flash === i && "cite-flash border-primary/60")}
              >
                <Link
                  href={`/inbox?id=${encodeURIComponent(c.id)}`}
                  className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="grid size-5 place-items-center rounded bg-primary/15 font-mono text-[0.68rem] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="font-mono text-[0.7rem] text-muted-foreground tabular" title="Similarity to your question">
                      {formatRatio(c.similarity)} match
                    </span>
                  </div>
                  <p className="line-clamp-4 text-sm leading-snug">{c.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <ChannelLabel channel={c.channel} className="text-xs" />
                    {c.customerLabel && <span>{c.customerLabel}</span>}
                    <time dateTime={c.createdAt} className="font-mono">
                      {formatDate(c.createdAt)}
                    </time>
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
