"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, RotateCw, TriangleAlert, Wand2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DateRangePicker, type DateRangeValue } from "@/components/app/date-range-picker";
import { createReport, toApiError } from "@/lib/api-client";
import { errorMessage } from "@/lib/notify";
import { presetRange } from "@/lib/format";

type Preset = "7" | "30" | "custom";

const STEPS = ["Counting feedback and themes…", "Comparing with the previous period…", "Picking representative quotes…", "Writing the narrative…"];

export function GenerateReportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>("7");
  const [custom, setCustom] = useState<DateRangeValue>({});
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ message: string; ai: boolean; fields: Record<string, string> } | null>(null);

  // Cosmetic progress while the (single, several-second) request runs.
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2200);
    return () => window.clearInterval(id);
  }, [busy]);

  const range = preset === "custom" ? custom : presetRange(Number(preset));
  const canSubmit = Boolean(range.from && range.to) && range.from !== range.to;

  async function generate() {
    if (!range.from || !range.to) return;
    setBusy(true);
    setError(null);
    try {
      const report = await createReport({ periodStart: range.from, periodEnd: range.to, title: title.trim() || undefined });
      setOpen(false);
      router.push(`/reports/${report.id}`);
    } catch (err) {
      const e = toApiError(err);
      setError({ message: errorMessage(e), ai: e.status === 502, fields: e.fieldErrors });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
      <DialogTrigger asChild>
        <Button>
          <FilePlus2 aria-hidden="true" />
          Generate report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Generate a VoC report</DialogTitle>
          <DialogDescription>Stats come straight from your data; the AI writes the narrative and recommendations.</DialogDescription>
        </DialogHeader>

        {busy ? (
          <div className="space-y-3 py-4" role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="size-4 animate-pulse text-primary motion-reduce:animate-none" aria-hidden="true" />
              {STEPS[step]}
            </p>
            <Progress value={((step + 1) / (STEPS.length + 1)) * 100} aria-label="Report generation progress" />
            <p className="text-xs text-muted-foreground">This usually takes 5–20 seconds.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium" id="period-label">
                Period
              </p>
              <ToggleGroup
                type="single"
                value={preset}
                onValueChange={(v) => v && setPreset(v as Preset)}
                aria-labelledby="period-label"
                className="justify-start"
              >
                <ToggleGroupItem value="7" className="px-3 text-xs">
                  Last 7 days
                </ToggleGroupItem>
                <ToggleGroupItem value="30" className="px-3 text-xs">
                  Last 30 days
                </ToggleGroupItem>
                <ToggleGroupItem value="custom" className="px-3 text-xs">
                  Custom
                </ToggleGroupItem>
              </ToggleGroup>
              {preset === "custom" && (
                <DateRangePicker value={custom} onChange={setCustom} label="Report period" placeholder="Pick a start and end date" className="w-full" />
              )}
              {error?.fields.periodEnd && <p className="text-xs text-destructive">{error.fields.periodEnd}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-title">Title (optional)</Label>
              <Input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Voice of Customer: September"
              />
            </div>
            {error && Object.keys(error.fields).length === 0 && (
              <Alert variant={error.ai ? "default" : "destructive"}>
                <TriangleAlert className="size-4" aria-hidden="true" />
                <AlertTitle>{error.ai ? "AI is temporarily unavailable" : "Couldn't generate the report"}</AlertTitle>
                <AlertDescription className="text-muted-foreground">{error.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={generate} loading={busy} disabled={!canSubmit}>
            {!busy && (error ? <RotateCw aria-hidden="true" /> : <Wand2 aria-hidden="true" />)}
            {busy ? "Generating…" : error ? "Try again" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
