"use client";

import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import { ArrowRight, FileText, LogIn, Mail, MessageCircleQuestion, Sparkles, TrendingUp } from "lucide-react";
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

const CONTACT_EMAIL = "vansh.srivastava746@gmail.com";
const GITHUB_USER = "shikhar746";

/** lucide dropped brand icons, so the GitHub mark is inlined. */
function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

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

      <section aria-labelledby="contact-heading" className="relative mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm sm:p-12">
          <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-px w-8 bg-primary" aria-hidden="true" />
            Contact us
          </p>
          <h2 id="contact-heading" className="mt-4 font-display text-3xl sm:text-4xl">
            Questions, feedback or a demo?
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">Reach out directly. We usually reply within a day.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <a href={`mailto:${CONTACT_EMAIL}`}>
                <Mail aria-hidden="true" />
                {CONTACT_EMAIL}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`https://github.com/${GITHUB_USER}`} target="_blank" rel="noopener noreferrer">
                <GithubMark />
                github.com/{GITHUB_USER}
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
    </MotionConfig>
  );
}
