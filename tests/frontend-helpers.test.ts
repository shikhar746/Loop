import { afterEach, describe, expect, it, vi } from "vitest";
import { readInboxParams } from "@/components/inbox/inbox-params";
import { themeSeriesConfig, CHART_COLORS } from "@/lib/chart-config";
import {
  channelLabel,
  formatChange,
  formatPct,
  formatScore,
  initials,
  parseDateParam,
  presetRange,
  sentenceCase,
  toDateParam,
} from "@/lib/format";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { CHANNELS } from "@/lib/validators/common";
import { feedbackListQuerySchema } from "@/lib/validators/feedback";

afterEach(() => vi.useRealTimers());

describe("format", () => {
  it("formatPct trims trailing zeros", () => {
    expect(formatPct(37.5)).toBe("37.5%");
    expect(formatPct(40)).toBe("40%");
    expect(formatPct(33.333, 0)).toBe("33%");
  });

  it("formatChange handles up, down, flat and 'new' (null)", () => {
    expect(formatChange(950)).toBe("+950%");
    expect(formatChange(-14.3)).toBe("−14.3%");
    expect(formatChange(0)).toBe("±0%");
    expect(formatChange(null)).toBe("New");
  });

  it("formatScore signs sentiment scores", () => {
    expect(formatScore(-0.8)).toBe("−0.80");
    expect(formatScore(0.25)).toBe("+0.25");
    expect(formatScore(null)).toBe("—");
  });

  it("presetRange covers N days including today, as yyyy-MM-dd", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 3, 15, 0)); // 3 Oct 2026, local
    expect(presetRange(7)).toEqual({ from: "2026-09-27", to: "2026-10-03" });
    expect(presetRange(1)).toEqual({ from: "2026-10-03", to: "2026-10-03" });
  });

  it("date params round-trip and reject garbage", () => {
    const d = parseDateParam("2026-02-28")!;
    expect(toDateParam(d)).toBe("2026-02-28");
    expect(parseDateParam("28/02/2026")).toBeUndefined();
    expect(parseDateParam(undefined)).toBeUndefined();
  });

  it("every backend channel has a human label", () => {
    for (const c of CHANNELS) expect(channelLabel(c)).not.toBe(c);
  });

  it("sentenceCase + initials", () => {
    expect(sentenceCase("is required")).toBe("Is required");
    expect(initials("avery  admin smith")).toBe("AA");
  });
});

describe("readInboxParams (URL → GET /api/feedback query)", () => {
  it("keeps valid filters and defaults sort/page", () => {
    const p = readInboxParams(new URLSearchParams("channel=APP_REVIEW&status=NEW"));
    expect(p).toMatchObject({ channel: "APP_REVIEW", status: "NEW", sort: "newest", page: 1, pageSize: 25 });
  });

  it("drops values the API would reject instead of sending a 400", () => {
    const p = readInboxParams(new URLSearchParams("channel=FAX&sentiment=meh&status=x&sort=random&page=-3"));
    expect(p.channel).toBeUndefined();
    expect(p.sentiment).toBeUndefined();
    expect(p.status).toBeUndefined();
    expect(p.sort).toBe("newest");
    expect(p.page).toBe(1);
  });

  it("caps search at the API's 200 chars and the result always validates", () => {
    const p = readInboxParams(new URLSearchParams({ q: "x".repeat(500), page: "3" }));
    expect(p.q).toHaveLength(200);
    const asQuery = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]));
    expect(feedbackListQuerySchema.safeParse(asQuery).success).toBe(true);
  });
});

describe("safeCallbackUrl (open-redirect guard)", () => {
  it.each([
    ["/inbox?id=1", "/inbox?id=1"],
    ["https://evil.example", "/dashboard"],
    ["//evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["/login", "/dashboard"],
    [undefined, "/dashboard"],
  ])("%s → %s", (input, expected) => {
    expect(safeCallbackUrl(input)).toBe(expected);
  });
});

describe("themeSeriesConfig (trend chart colours)", () => {
  it("spiking → spike colour, top non-spiking → accent, rest → purple series", () => {
    const cfg = themeSeriesConfig([
      { themeId: "a", name: "Billing", isSpiking: true },
      { themeId: "b", name: "Perf", isSpiking: false },
      { themeId: "c", name: "Mobile", isSpiking: false },
    ]);
    expect(cfg.a).toMatchObject({ color: CHART_COLORS.spike, label: "Billing (spiking)" });
    expect(cfg.b.color).toBe(CHART_COLORS.accent);
    expect(cfg.c.color).toBe(CHART_COLORS.series[0]);
  });
});
