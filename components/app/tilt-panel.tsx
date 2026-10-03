"use client";

import { useCallback, useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import TiltedCard from "@/components/reactbits/TiltedCard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsCoarsePointer, usePrefersReducedMotion } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

// Tilted Card needs an image; ours is a generated plum/violet backplate (with faint contour rings) that
// shows as the card's glowing edge behind the shadcn Card in the overlay.
const BACKPLATE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" preserveAspectRatio="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#3b1670"/><stop offset="0.55" stop-color="#1c0b33"/><stop offset="1" stop-color="#120820"/>
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#g)"/>
    <g fill="none" stroke="#a78bfa" stroke-opacity="0.16">
      <ellipse cx="330" cy="40" rx="60" ry="38"/><ellipse cx="330" cy="40" rx="110" ry="70"/>
      <ellipse cx="330" cy="40" rx="170" ry="110"/><ellipse cx="330" cy="40" rx="240" ry="160"/>
    </g>
  </svg>`,
)}`;

const PANEL_HEIGHT = "272px";

function PanelBody({ icon: Icon, title, copy, index }: { icon: LucideIcon; title: string; copy: string; index: number }) {
  return (
    <Card className="group/panel relative flex h-full flex-col overflow-hidden border-violet/25 bg-[hsl(270_45%_9%/0.86)] backdrop-blur-[2px]">
      {/* Sheen that follows the cursor (--mx/--my set by the tilt wrapper). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/panel:opacity-100"
        style={{
          background:
            "radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--violet) / 0.28), transparent 60%)",
        }}
      />
      <CardHeader className="relative flex-1 justify-between gap-6 p-6">
        <div className="flex items-start justify-between">
          <div className="grid size-11 place-items-center rounded-lg border border-violet/30 bg-violet/15 shadow-[0_0_24px_-6px_hsl(var(--violet)/0.8)]">
            <Icon className="size-5 text-lavender" aria-hidden="true" />
          </div>
          <span className="font-mono text-xs text-muted-foreground tabular">0{index + 1}</span>
        </div>
        <div className="space-y-2">
          <CardTitle className="display-wonk flex items-center gap-1.5 text-xl font-bold lg:text-2xl">
            {title}
            <ArrowUpRight
              className="size-4 text-primary opacity-0 transition-opacity group-hover/panel:opacity-100"
              aria-hidden="true"
            />
          </CardTitle>
          <CardDescription className="text-[0.92rem] leading-relaxed text-foreground/75">{copy}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * A landing feature panel: React Bits Tilted Card (3D tilt + spring scale) with a shadcn Card in its
 * overlay and a cursor-following sheen. Touch devices and reduced motion get the same Card, flat.
 */
export function TiltPanel({
  icon,
  title,
  copy,
  href,
  index,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
  href: string;
  index: number;
}) {
  const reduced = usePrefersReducedMotion();
  const coarse = useIsCoarsePointer();
  const flat = reduced || coarse;
  const wrapRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  const body = <PanelBody icon={icon} title={title} copy={copy} index={index} />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay: 0.55 + index * 0.1, duration: 0.7, ease: [0.2, 0.75, 0.2, 1] }}
    >
      <Link
        href={href}
        aria-label={`${title}: ${copy}`}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      >
        {flat ? (
          <div style={{ height: PANEL_HEIGHT }}>{body}</div>
        ) : (
          <div
            ref={wrapRef}
            onMouseMove={onMove}
            className="drop-shadow-[0_20px_40px_hsl(272_80%_3%/0.7)] transition-[filter] duration-300 hover:drop-shadow-[0_24px_50px_hsl(266_88%_50%/0.35)]"
          >
            <TiltedCard
              imageSrc={BACKPLATE}
              altText=""
              containerHeight={PANEL_HEIGHT}
              containerWidth="100%"
              imageHeight={PANEL_HEIGHT}
              imageWidth="100%"
              rotateAmplitude={11}
              scaleOnHover={1.045}
              showMobileWarning={false}
              showTooltip={false}
              displayOverlayContent
              overlayContent={body}
            />
          </div>
        )}
      </Link>
    </motion.div>
  );
}

export const tiltGridClass = cn("grid gap-5 sm:grid-cols-2 xl:grid-cols-4");
