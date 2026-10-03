"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { processPending } from "@/lib/api-client";
import { toastError } from "@/lib/notify";

export type ClassifyLoopState = { running: boolean; done: number; total: number; failed: number };

const MAX_BATCHES = 250;

/**
 * Calls POST /api/feedback/process-pending (8 items per call) until `remaining` is 0.
 * `onBatch` runs after every batch (e.g. a silent table refetch); `onFinish` once at the end.
 */
export function useClassifyLoop({ onBatch, onFinish }: { onBatch?: () => void; onFinish?: () => void } = {}) {
  const [state, setState] = useState<ClassifyLoopState>({ running: false, done: 0, total: 0, failed: 0 });
  const runningRef = useRef(false);
  const mountedRef = useRef(true);
  const callbacks = useRef({ onBatch, onFinish });
  callbacks.current = { onBatch, onFinish };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    let total = 0;
    let processed = 0;
    let failed = 0;
    let stalls = 0;
    setState({ running: true, done: 0, total: 0, failed: 0 });

    try {
      for (let i = 0; i < MAX_BATCHES && mountedRef.current; i++) {
        const r = await processPending();
        processed += r.processed;
        failed += r.failed;
        total = Math.max(total, processed + failed + r.remaining);
        if (mountedRef.current) setState({ running: true, done: processed + failed, total, failed });
        callbacks.current.onBatch?.();
        if (r.remaining === 0) break;
        // Nothing moved twice in a row (e.g. only cooling-down FAILED items left): stop instead of spinning.
        stalls = r.processed === 0 && r.failed === 0 ? stalls + 1 : 0;
        if (stalls >= 2) break;
      }
      if (total === 0) toast.success("Nothing to classify. Everything is up to date.");
      else if (failed > 0)
        toast.warning(`Classified ${processed} of ${total}. ${failed} need review and will be retried.`);
      else toast.success(`Classified ${processed} feedback item${processed === 1 ? "" : "s"}.`);
    } catch (err) {
      toastError(err, { retry: () => void run() });
    } finally {
      runningRef.current = false;
      if (mountedRef.current) setState((s) => ({ ...s, running: false }));
      callbacks.current.onFinish?.();
    }
  }, []);

  return { ...state, run };
}
