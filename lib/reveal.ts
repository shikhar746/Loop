import type { CSSProperties } from "react";

/** Props for one step of the page-load stagger (see `.reveal` in globals.css). */
export function reveal(i: number): { className: string; style: CSSProperties } {
  return { className: "reveal", style: { "--i": i } as CSSProperties };
}
