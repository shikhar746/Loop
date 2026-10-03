"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string, initial = false): boolean {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/** True when the user asked the OS to reduce motion. Defaults to true until known (no flash of motion). */
export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)", true);

/** True on touch-first devices (no hover, coarse pointer). */
export const useIsCoarsePointer = () => useMediaQuery("(hover: none), (pointer: coarse)", true);
