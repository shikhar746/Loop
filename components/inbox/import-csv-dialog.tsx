"use client";

import { useRef, useState } from "react";
import { CircleAlert, CircleCheck, FileUp, Upload } from "lucide-react";
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
import { importFeedback } from "@/lib/api-client";
import { errorMessage } from "@/lib/notify";
import { formatNumber } from "@/lib/format";
import type { ImportResult } from "@/lib/types";
import { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS } from "@/lib/validators/feedback";

const COLUMNS = [
  { name: "content", note: "required" },
  { name: "channel", note: "e.g. Support ticket, App review, NPS" },
  { name: "customer_label", note: "optional" },
  { name: "created_at", note: "optional ISO date" },
];

/** CSV upload → result summary. `onImported` fires when at least one row landed (the caller starts classifying). */
export function ImportCsvDialog({ onImported }: { onImported: (result: ImportResult) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a .csv file first.");
      return;
    }
    if (file.size > IMPORT_MAX_BYTES) {
      setError("CSV files can be at most 2 MB.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await importFeedback(file);
      setResult(r);
      if (r.imported > 0) onImported(r);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp aria-hidden="true" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Import CSV</DialogTitle>
          <DialogDescription>
            Up to {formatNumber(IMPORT_MAX_ROWS)} rows, 2 MB. Rows are classified automatically after import.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4" role="status" aria-live="polite">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-positive/30 bg-positive/10 p-4">
                <p className="eyebrow flex items-center gap-1.5 text-positive">
                  <CircleCheck className="size-3.5" aria-hidden="true" /> Imported
                </p>
                <p className="mt-1 font-mono text-3xl tabular">{formatNumber(result.imported)}</p>
              </div>
              <div className="rounded-lg border border-negative/30 bg-negative/10 p-4">
                <p className="eyebrow flex items-center gap-1.5 text-negative">
                  <CircleAlert className="size-3.5" aria-hidden="true" /> Failed
                </p>
                <p className="mt-1 font-mono text-3xl tabular">{formatNumber(result.failed)}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">First problems</p>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-border bg-raised p-3 text-sm">
                  {result.errors.slice(0, 8).map((e) => (
                    <li key={`${e.row}-${e.message}`} className="flex gap-2">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">Row {e.row}</span>
                      <span className="text-foreground/90">{e.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={reset}>
                Import another
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="rounded-lg border border-border bg-raised p-3">
              <p className="eyebrow mb-2">Expected columns</p>
              <ul className="space-y-1 text-sm">
                {COLUMNS.map((c) => (
                  <li key={c.name} className="flex flex-wrap items-baseline gap-x-2">
                    <code className="font-mono text-[0.8rem] text-primary">{c.name}</code>
                    <span className="text-xs text-muted-foreground">{c.note}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input
                id="csv-file"
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError(null);
                }}
                className="cursor-pointer file:mr-3 file:rounded file:bg-secondary file:px-2 file:text-secondary-foreground"
                aria-describedby={error ? "csv-error" : undefined}
              />
            </div>
            {error && (
              <Alert variant="destructive" id="csv-error">
                <CircleAlert className="size-4" aria-hidden="true" />
                <AlertTitle>Import failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={!file}>
                {!busy && <Upload aria-hidden="true" />}
                {busy ? "Importing…" : "Import"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
