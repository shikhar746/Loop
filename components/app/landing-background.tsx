"use client";

import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/lib/hooks/use-media-query";

const Topography = dynamic(() => import("@/components/reactbits/Topography"), {
  ssr: false,
  loading: () => null,
});

/**
 * React Bits Topography as a living purple contour map behind the landing hero. Contours stay thin and
 * dim in the centre band where the headline sits; the cursor raises the terrain a little. Reduced
 * motion freezes the map (speed 0, no cursor elevation).
 */
export function LandingBackground() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div aria-hidden="true" className="bg-atmosphere absolute inset-0" />
      <div aria-hidden="true" className="absolute inset-0">
        <Topography
          lowColor="#2a0f4d"
          midColor="#7c3aed"
          highColor="#d9f99d"
          colorMode="elevation"
          bands={9}
          thickness={0.012}
          scale={1.15}
          speed={reduced ? 0 : 0.18}
          morphAmount={2.6}
          morphSpeed={reduced ? 0 : 0.04}
          glow={0.35}
          contrast={2.4}
          brightness={0.85}
          opacity={0.85}
          grain
          grainIntensity={0.04}
          mouseInteraction={!reduced}
          mouseRadius={0.28}
          mouseStrength={0.45}
          className="h-full w-full"
        />
      </div>
      {/* Vignette: darkens the centre-left text column so the hero stays crisp. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_45%,hsl(var(--background)/0.82),hsl(var(--background)/0.35)_60%,transparent_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-background"
      />
    </div>
  );
}
