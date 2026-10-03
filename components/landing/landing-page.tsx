"use client";

import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import { ArrowRight, FileText, LogIn, MessageCircleQuestion, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingBackground } from "@/components/app/landing-background";
import { TiltPanel, tiltGridClass } from "@/components/app/tilt-panel";
import { Wordmark } from "@/components/app/wordmark";

const PANELS = [
  {
    icon: Sparkles,
    title: "Auto-classification",
    copy: "Every ticket, review and NPS comment tagged with sentiment, theme and feature area.",
  },
  {
    icon: TrendingUp,
    title: "Themes & trends",
    copy: "See which themes are growing, and get flagged the moment one starts to spike.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Ask LOOP",
    copy: "Ask in plain English and get answers that cite the exact feedback behind them.",
  },
  {
    icon: FileText,
    title: "Voice-of-Customer reports",
    copy: "A leadership-ready report with stats, quotes and recommended actions, in seconds.",
  },
];

const EASE = [0.2, 0.75, 0.2, 1] as const;

export function LandingPage() {
  // MotionConfig "user": under prefers-reduced-motion, motion drops the transforms and keeps a plain fade.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 22, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { delay, duration: 0.8, ease: EASE },
  });

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative isolate min-h-dvh overflow-x-hidden">
      <section className="relative isolate flex min-h-[92dvh] flex-col">
        <LandingBackground />

        {/* pointer-events-none lets the cursor reach the contour map; interactive children opt back in. */}
        <div className="pointer-events-none mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 sm:px-8">
          <motion.header {...rise(0)} className="flex items-center justify-between py-6">
            <Link href="/" className="pointer-events-auto rounded-md" aria-label="LOOP home">
              <Wordmark size="md" />
            </Link>
            <Button asChild variant="ghost" size="sm" className="pointer-events-auto">
              <Link href="/login">
                <LogIn aria-hidden="true" />
                Sign in
              </Link>
            </Button>
          </motion.header>

          <div className="flex flex-1 flex-col justify-center pb-16 pt-6">
            <motion.p {...rise(0.1)} className="eyebrow mb-6 flex items-center gap-2 text-lavender">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden="true" />
              Customer-feedback intelligence
            </motion.p>
            <motion.h1
              {...rise(0.18)}
              className="display-wonk max-w-5xl text-balance font-display text-[2.6rem] font-black leading-[0.92] tracking-[-0.025em] sm:text-7xl lg:text-[6.2rem]"
            >
              LOOP turns scattered customer feedback into a{" "}
              <span className="font-extralight italic text-primary">ranked, evidence-backed</span> list of what to do
              next.
            </motion.h1>
            <motion.p {...rise(0.3)} className="mt-8 max-w-xl text-lg font-light leading-relaxed text-foreground/80">
              Pull in tickets, reviews, NPS and sales notes. LOOP classifies every item, spots rising themes, and
              backs each answer with the customers who said it.
            </motion.p>
            <motion.div {...rise(0.42)} className="pointer-events-auto mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create workspace
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">
                  <LogIn aria-hidden="true" />
                  Sign in
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8">
        <h2 id="features-heading" className="sr-only">
          What LOOP does
        </h2>
        <div className={tiltGridClass}>
          {PANELS.map((p, i) => (
            <TiltPanel key={p.title} {...p} href="/signup" index={i} />
          ))}
        </div>
        <p className="mt-14 text-center font-mono text-xs text-muted-foreground">
          Built for product managers, support leads and founders.
        </p>
      </section>
    </div>
    </MotionConfig>
  );
}
