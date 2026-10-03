"use client";

import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/hooks/use-media-query";

// WebGL, so client-only; the static purple base shows while it loads (and if WebGL is unavailable).
const GradientWaves = dynamic(() => import("@/components/reactbits/GradientWaves"), {
  ssr: false,
  loading: () => null,
});

/**
 * React Bits Gradient Waves behind the app shell and auth pages. Mounted once in the (app) layout so
 * it survives navigation. Calm by design: low detail, slow, dimmed, no cursor parallax. The component
 * already pauses when the tab is hidden or it scrolls out of view; reduced motion freezes it.
 */
export function AppBackground() {
  const reduced = usePrefersReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-atmosphere absolute inset-0" />
      <div className="absolute inset-0 opacity-70">
        <GradientWaves
          horizonColor="#1a0b2e"
          waveColor="#5b2a9e"
          crestColor="#b9a3ff"
          detail="low"
          speed={reduced ? 0 : 0.12}
          amplitude={1.6}
          waveScale={0.55}
          waveRatio={0.85}
          swell={28}
          turbulence={12}
          tilt={1.11}
          height={5.2}
          fogDepth={18}
          brightness={0.55}
          opacity={0.75}
          mouseInteraction={false}
          parallaxStrength={0}
          grain
          grainIntensity={0.035}
          className="h-full w-full"
        />
      </div>
      {/* Legibility veil: keeps every overlay text well above AA contrast. */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/55 to-background/85" />
    </div>
  );
}
