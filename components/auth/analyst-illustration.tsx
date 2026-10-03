"use client";

import { useEffect, useRef } from "react";

/**
 * Animated sign-in illustration: a woman analysing a chart on paper. One 10s loop — she writes three
 * lines of notes, rests her chin on her hand to think (thought bubble: "?" then a lightbulb as she
 * circles the spike bar), then the page clears and she writes again.
 *
 * Both arms are two-bone rigs (shoulder → elbow → wrist): each frame picks where the hand should be and
 * solves the elbow with inverse kinematics, so the arms bend instead of sliding. Head, eyes and the
 * thought bubble are CSS keyframes on the same 10s clock. Under prefers-reduced-motion it holds the
 * "notes written" frame.
 */

type Pt = { x: number; y: number };
type Arm = { s: Pt; e: Pt; h: Pt; angle: number };
type Frame = { pen: Arm & { tip: Pt }; left: Arm; ink: [number, number, number]; inkOpacity: number };

const LOOP_S = 10; // keep in step with the CSS keyframes below
const PEN_SHOULDER = { x: 308, y: 316 };
const LEFT_SHOULDER = { x: 172, y: 316 };
const LINES = [392, 408, 424];
const X0 = 230;
const X1 = 270;
const THINK_TIP = { x: 258, y: 398 };
const REST = { x: 150, y: 386 };
const CHIN = { x: 229, y: 284 };
const VIA = { x: 214, y: 352 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const mix = (a: Pt, b: Pt, k: number): Pt => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const bez = (a: Pt, c: Pt, b: Pt, k: number): Pt => mix(mix(a, c, k), mix(c, b, k), k);
/** Pen position on a line of handwriting (matches the ink paths: 10px half-waves, 2.5px tall). */
const onLine = (x: number, line: number): Pt => ({ x, y: LINES[line] - 2.5 * Math.sin((Math.PI * (x - X0)) / 10) });

/** Two-bone IK: elbow for a shoulder, a hand target and segment lengths; `bend` picks which side it folds to. */
function solveArm(s: Pt, h: Pt, l1: number, l2: number, bend: 1 | -1): Arm {
  const dx = h.x - s.x;
  const dy = h.y - s.y;
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1), l1 + l2 - 0.5);
  const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
  const ang = Math.atan2(dy, dx) + bend * a;
  const e = { x: s.x + l1 * Math.cos(ang), y: s.y + l1 * Math.sin(ang) };
  return { s, e, h, angle: (Math.atan2(h.y - e.y, h.x - e.x) * 180) / Math.PI };
}

function penTip(t: number, ink: number[]): Pt {
  if (t < 0.4) return onLine(X0, 0);
  for (let i = 0; i < 3; i++) {
    const ws = 0.4 + i * 1.4;
    const we = ws + 1;
    if (t < we) return onLine(X0 + (X1 - X0) * ink[i], i);
    if (i < 2 && t < we + 0.4) {
      // lift, carry back to the start of the next line, set down
      const k = ease(seg(t, we, we + 0.4));
      const p = mix(onLine(X1, i), onLine(X0, i + 1), k);
      return { x: p.x, y: p.y - 7 * Math.sin(Math.PI * k) };
    }
  }
  if (t < 4.8) {
    const k = ease(seg(t, 4.2, 4.8));
    const p = mix(onLine(X1, 2), THINK_TIP, k);
    return { x: p.x, y: p.y - 6 * Math.sin(Math.PI * k) };
  }
  if (t < 8.4) {
    // thinking: two slow pen taps, a pause, two more
    const ph = t - 4.8;
    const tap = ph % 2.8 < 1.4 ? Math.abs(Math.sin((Math.PI * ph) / 0.7)) : 0;
    return { x: THINK_TIP.x, y: THINK_TIP.y - 3 * tap };
  }
  if (t < 9.4) {
    const k = ease(seg(t, 8.4, 9.4));
    const p = mix(THINK_TIP, onLine(X0, 0), k);
    return { x: p.x, y: p.y - 10 * Math.sin(Math.PI * k) };
  }
  return onLine(X0, 0);
}

function leftHand(t: number): Pt {
  if (t < 4.2) return REST;
  if (t < 5.2) return bez(REST, VIA, CHIN, ease(seg(t, 4.2, 5.2)));
  if (t < 8.4) return { x: CHIN.x, y: CHIN.y + 1.2 * Math.sin((2 * Math.PI * (t - 5.2)) / 1.6) };
  if (t < 9.4) return bez(CHIN, VIA, REST, ease(seg(t, 8.4, 9.4)));
  return REST;
}

/**
 * At rest the arm lies folded on the desk (elbow tucked in, forearm foreshortened as it points at the
 * viewer); at the chin the elbow sits under the hand. Blend the two elbow solutions instead of flipping.
 */
function leftArm(t: number): Arm {
  const w = t < 4.2 ? 0 : t < 5.2 ? ease(seg(t, 4.2, 5.2)) : t < 8.4 ? 1 : 1 - ease(seg(t, 8.4, 9.4));
  const h = leftHand(t);
  const l2 = 48 + 18 * w;
  const e = mix(solveArm(LEFT_SHOULDER, h, 57, l2, -1).e, solveArm(LEFT_SHOULDER, h, 57, l2, 1).e, w);
  return { s: LEFT_SHOULDER, e, h, angle: (Math.atan2(h.y - e.y, h.x - e.x) * 180) / Math.PI };
}

function frameAt(t: number): Frame {
  const ink = [0, 1, 2].map((i) => {
    const r = seg(t, 0.4 + i * 1.4, 1.4 + i * 1.4);
    return 0.6 * r + 0.4 * ease(r);
  }) as [number, number, number];
  const tip = penTip(t, ink);
  const pen = solveArm(PEN_SHOULDER, { x: tip.x + 12, y: tip.y - 10 }, 64, 62, -1);
  return {
    pen: { ...pen, tip },
    left: leftArm(t),
    ink,
    inkOpacity: t < 9.2 ? 1 : 1 - seg(t, 9.2, 9.6),
  };
}

const lineAttrs = (a: Pt, b: Pt) => ({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
const tr = (p: Pt, angle = 0) => `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${angle.toFixed(1)})`;

function setLine(el: Element | null, a: Pt, b: Pt) {
  el?.setAttribute("x1", a.x.toFixed(2));
  el?.setAttribute("y1", a.y.toFixed(2));
  el?.setAttribute("x2", b.x.toFixed(2));
  el?.setAttribute("y2", b.y.toFixed(2));
}

function applyFrame(svg: SVGSVGElement, f: Frame) {
  const q = (sel: string) => svg.querySelector(sel);
  setLine(q(".li-pen-upper"), f.pen.s, f.pen.e);
  setLine(q(".li-pen-fore"), f.pen.e, f.pen.h);
  q(".li-pen-hand")?.setAttribute("transform", tr(f.pen.h));
  setLine(q(".li-left-upper"), f.left.s, f.left.e);
  setLine(q(".li-left-fore"), f.left.e, f.left.h);
  q(".li-left-hand")?.setAttribute("transform", tr(f.left.h, f.left.angle));
  svg.querySelectorAll<SVGPathElement>(".li-ink").forEach((el, i) => {
    el.style.strokeDashoffset = String(1 - f.ink[i]);
    el.style.opacity = String(f.inkOpacity);
  });
}

const FIRST = frameAt(0);

export function AnalystIllustration({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      applyFrame(svg, frameAt(4.3));
      return;
    }
    // Restart the CSS keyframes so they share t=0 with the arm rig.
    svg.getAnimations({ subtree: true }).forEach((a) => (a.currentTime = 0));
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      applyFrame(svg, frameAt(((now - start) / 1000) % LOOP_S));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const f = FIRST;
  return (
    <svg ref={ref} viewBox="0 50 480 440" aria-hidden="true" focusable="false" className={`li ${className ?? ""}`}>
      <style>{CSS}</style>

      {/* backdrop */}
      <circle cx="240" cy="270" r="205" className="li-backdrop" />
      <g className="li-float">
        <rect x="58" y="120" width="8" height="22" rx="3" className="li-glyph" />
        <rect x="70" y="110" width="8" height="32" rx="3" className="li-glyph" />
        <rect x="82" y="126" width="8" height="16" rx="3" className="li-glyph" />
      </g>
      <g className="li-float li-float-2">
        <circle cx="430" cy="250" r="5" className="li-glyph" />
        <circle cx="446" cy="232" r="3.5" className="li-glyph" />
        <circle cx="414" cy="226" r="2.5" className="li-glyph" />
      </g>

      {/* body */}
      <rect x="230" y="264" width="20" height="30" rx="8" className="li-skin" />
      <path
        d="M226,280 C198,282 172,292 164,318 C160,334 160,352 162,372 L318,372 C320,352 320,334 316,318 C308,292 282,282 254,280 Z"
        className="li-sweater"
      />
      <path d="M228,281 Q240,296 252,281 Z" className="li-skin-shade" />
      <path d="M224,280 Q240,300 256,280" className="li-seam li-collar" />
      <path d="M170,328 q6,14 8,34 M310,328 q-6,14 -8,34" className="li-seam" />

      {/* head */}
      <g className="li-head">
        <g transform="translate(0 20)">
          <path d="M198,206 C188,250 190,290 200,312 L226,312 C220,280 218,250 222,224 Z" className="li-hair" />
          <path d="M282,206 C292,250 290,290 280,312 L254,312 C260,280 262,250 258,224 Z" className="li-hair" />
          <ellipse cx="206" cy="218" rx="5" ry="8" className="li-skin-shade" />
          <ellipse cx="274" cy="218" rx="5" ry="8" className="li-skin-shade" />
          <ellipse cx="240" cy="214" rx="34" ry="40" className="li-skin" />
          <circle cx="252" cy="158" r="15" className="li-hair" />
          <path
            d="M204,214 C200,176 220,160 242,160 C266,160 282,178 277,214 C270,196 256,186 244,190 C232,184 214,192 204,214 Z"
            className="li-hair"
          />
          <path d="M220,201 q8,-4 15,0 M245,201 q7,-4 15,0" className="li-brow" />
          <g className="li-look">
            <ellipse cx="228" cy="216" rx="3.2" ry="3.8" className="li-eye" />
            <ellipse cx="252" cy="216" rx="3.2" ry="3.8" className="li-eye" />
          </g>
          <circle cx="228" cy="216" r="10" className="li-glasses" />
          <circle cx="252" cy="216" r="10" className="li-glasses" />
          <path d="M238,215 Q240,212 242,215" className="li-glasses" />
          <path d="M240,221 q-3,8 1,10" className="li-nose" />
          <circle cx="221" cy="233" r="5" className="li-blush" />
          <circle cx="259" cy="233" r="5" className="li-blush" />
          <path d="M233,239 q7,5 14,0" className="li-mouth" />
        </g>
      </g>

      {/* desk + paper */}
      <polygon points="36,358 444,358 472,452 8,452" className="li-desk" />
      <rect x="8" y="452" width="464" height="22" rx="4" className="li-desk-edge" />
      <polygon points="133,370 357,370 375,450 115,450" className="li-paper-shadow" />
      <polygon points="128,366 352,366 370,446 110,446" className="li-paper" />
      <path d="M146,380 h54" className="li-ink-faint li-thick" />
      <path d="M144,434 h76" className="li-ink-faint" />
      <rect x="148" y="418" width="10" height="16" rx="2" className="li-bar" />
      <rect x="162" y="410" width="10" height="24" rx="2" className="li-bar" />
      <rect x="176" y="414" width="10" height="20" rx="2" className="li-bar" />
      <rect x="190" y="396" width="10" height="38" rx="2" className="li-bar-spike" />
      <rect x="204" y="406" width="10" height="28" rx="2" className="li-bar" />
      <ellipse cx="195" cy="413" rx="14" ry="24" pathLength={1} className="li-ring" />
      <path d="M230,392 q5,-5 10,0 t10,0 t10,0 t10,0" pathLength={1} className="li-ink" style={{ strokeDashoffset: 1 - f.ink[0] }} />
      <path d="M230,408 q5,-5 10,0 t10,0 t10,0 t10,0" pathLength={1} className="li-ink" style={{ strokeDashoffset: 1 - f.ink[1] }} />
      <path d="M230,424 q5,-5 10,0 t10,0 t10,0 t10,0" pathLength={1} className="li-ink" style={{ strokeDashoffset: 1 - f.ink[2] }} />

      {/* her right arm: holds the paper while she writes, props her chin while she thinks */}
      <line {...lineAttrs(f.left.s, f.left.e)} className="li-arm li-upper li-left-upper" />
      <line {...lineAttrs(f.left.e, f.left.h)} className="li-arm li-left-fore" />
      <g className="li-left-hand" transform={tr(f.left.h, f.left.angle)}>
        <ellipse rx="13" ry="10" className="li-skin" />
      </g>

      {/* writing arm; the pen keeps a fixed writing angle, tip 12px left of and 10px below the hand */}
      <line {...lineAttrs(f.pen.s, f.pen.e)} className="li-arm li-upper li-pen-upper" />
      <line {...lineAttrs(f.pen.e, f.pen.h)} className="li-arm li-pen-fore" />
      <g className="li-pen-hand" transform={tr(f.pen.h)}>
        <line x1="-12" y1="10" x2="16" y2="-22" className="li-pen-body" />
        <circle cx="-11.5" cy="9.5" r="1.8" className="li-pen-tip" />
        <ellipse rx="12" ry="10" className="li-skin" />
        <ellipse cx="-6" cy="4" rx="5" ry="4" className="li-skin-shade" />
      </g>

      {/* thought bubble */}
      <circle cx="292" cy="186" r="5" className="li-cloud li-b1" />
      <circle cx="310" cy="160" r="8" className="li-cloud li-b2" />
      <g className="li-b3">
        <circle cx="352" cy="112" r="30" className="li-cloud" />
        <circle cx="382" cy="104" r="26" className="li-cloud" />
        <circle cx="404" cy="122" r="22" className="li-cloud" />
        <circle cx="330" cy="126" r="20" className="li-cloud" />
        <circle cx="372" cy="134" r="24" className="li-cloud" />
        <text x="368" y="132" textAnchor="middle" className="li-q">
          ?
        </text>
        <g className="li-bulb">
          <circle cx="368" cy="112" r="20" className="li-glow" />
          <circle cx="368" cy="110" r="11" className="li-bulb-glass" />
          <rect x="362" y="119" width="12" height="8" rx="2" className="li-bulb-base" />
          <path d="M368,84 v6 M346,94 l4,4 M390,94 l-4,4 M340,112 h6 M396,112 h-6" className="li-rays" />
        </g>
      </g>
    </svg>
  );
}

const CSS = `
.li * { transform-box: view-box; }
.li-backdrop { fill: hsl(var(--plum) / 0.35); }
.li-glyph { fill: hsl(var(--lavender) / 0.35); }
.li-sweater { fill: hsl(var(--violet)); }
.li-seam { fill: none; stroke: hsl(266 55% 56%); stroke-width: 2; stroke-linecap: round; }
.li-collar { stroke-width: 3.5; }
.li-arm { stroke: hsl(var(--violet)); stroke-width: 22; stroke-linecap: round; }
.li-upper { stroke-width: 24; }
.li-skin { fill: #d39a78; }
.li-skin-shade { fill: #b97f60; }
.li-hair { fill: #2b1633; }
.li-brow { fill: none; stroke: #2b1633; stroke-width: 2.5; stroke-linecap: round; }
.li-eye { fill: #1b0f24; transform-box: fill-box; transform-origin: center; }
.li-glasses { fill: none; stroke: #1b0f24; stroke-width: 2; }
.li-nose { fill: none; stroke: #a86e52; stroke-width: 1.8; stroke-linecap: round; }
.li-blush { fill: #f08f8f; opacity: 0.35; }
.li-mouth { fill: none; stroke: #8a3d4a; stroke-width: 2.2; stroke-linecap: round; }
.li-desk { fill: hsl(var(--surface-raised)); }
.li-desk-edge { fill: hsl(var(--card)); }
.li-paper { fill: #f6f2ff; }
.li-paper-shadow { fill: hsl(var(--background) / 0.5); }
.li-ink-faint { fill: none; stroke: #b9a8d6; stroke-width: 1.5; stroke-linecap: round; }
.li-thick { stroke-width: 3; }
.li-bar { fill: hsl(var(--violet) / 0.75); }
.li-bar-spike { fill: hsl(var(--orchid)); }
.li-ink { fill: none; stroke: #4c2a6e; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 1; }
.li-ring { fill: none; stroke: hsl(var(--primary)); stroke-width: 2.5; stroke-dasharray: 1; stroke-dashoffset: 1; }
.li-pen-body { stroke: #2b1633; stroke-width: 4; stroke-linecap: round; }
.li-pen-tip { fill: hsl(var(--primary)); }
.li-cloud { fill: #f3eefe; }
.li-q { font-size: 38px; font-weight: 900; font-family: var(--font-display, Georgia), serif; fill: hsl(var(--plum)); }
.li-glow { fill: hsl(var(--primary) / 0.35); }
.li-bulb-glass { fill: hsl(var(--primary)); }
.li-bulb-base { fill: #6b5a7a; }
.li-rays { fill: none; stroke: hsl(var(--primary)); stroke-width: 2.5; stroke-linecap: round; }
.li-b1, .li-b2, .li-b3, .li-q, .li-bulb { opacity: 0; }
.li-head { transform-origin: 240px 282px; }
.li-b1, .li-b2, .li-b3, .li-bulb { transform-box: fill-box; transform-origin: center; }

@media (prefers-reduced-motion: no-preference) {
  .li-ring { animation: li-ring 10s linear infinite; }
  .li-head { animation: li-head 10s ease-in-out infinite; }
  .li-look { animation: li-look 10s ease-in-out infinite; }
  .li-eye { animation: li-blink 10s linear infinite; }
  .li-b1 { animation: li-b1 10s ease-out infinite; }
  .li-b2 { animation: li-b2 10s ease-out infinite; }
  .li-b3 { animation: li-b3 10s ease-out infinite; }
  .li-q { animation: li-q 10s linear infinite; }
  .li-bulb { animation: li-bulb 10s ease-out infinite; }
  .li-glow { animation: li-glow 1.2s ease-in-out infinite alternate; }
  .li-float { animation: li-float 6s ease-in-out infinite alternate; }
  .li-float-2 { animation-delay: -3s; }
}

@keyframes li-ring {
  0%, 72% { stroke-dashoffset: 1; opacity: 1; }
  80%, 92% { stroke-dashoffset: 0; opacity: 1; }
  97% { stroke-dashoffset: 0; opacity: 0; }
  98%, 100% { stroke-dashoffset: 1; opacity: 0; }
}
@keyframes li-head {
  0%, 42% { transform: rotate(0); }
  48%, 84% { transform: rotate(6deg); }
  90%, 100% { transform: rotate(0); }
}
@keyframes li-look {
  0%, 40% { transform: translate(0, 2px); }
  46%, 84% { transform: translate(3px, -3px); }
  90%, 100% { transform: translate(0, 2px); }
}
@keyframes li-blink {
  0%, 44%, 46%, 88%, 90%, 100% { transform: scaleY(1); }
  45%, 89% { transform: scaleY(0.1); }
}
@keyframes li-b1 {
  0%, 46% { opacity: 0; transform: scale(0.4); }
  49%, 86% { opacity: 1; transform: scale(1); }
  90%, 100% { opacity: 0; transform: scale(0.4); }
}
@keyframes li-b2 {
  0%, 49% { opacity: 0; transform: scale(0.4); }
  52%, 86% { opacity: 1; transform: scale(1); }
  90%, 100% { opacity: 0; transform: scale(0.4); }
}
@keyframes li-b3 {
  0%, 52% { opacity: 0; transform: scale(0.6); }
  56%, 86% { opacity: 1; transform: scale(1); }
  90%, 100% { opacity: 0; transform: scale(0.6); }
}
@keyframes li-q {
  0%, 54% { opacity: 0; }
  58%, 70% { opacity: 1; }
  73%, 100% { opacity: 0; }
}
@keyframes li-bulb {
  0%, 72% { opacity: 0; transform: scale(0.6); }
  76%, 86% { opacity: 1; transform: scale(1); }
  90%, 100% { opacity: 0; transform: scale(0.6); }
}
@keyframes li-glow {
  from { opacity: 0.4; }
  to { opacity: 1; }
}
@keyframes li-float {
  from { transform: translateY(0); }
  to { transform: translateY(-8px); }
}
`;
