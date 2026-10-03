"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, request, toApiError } from "@/lib/api-client";

export type UseApiResult<T> = {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  /** Re-runs the request. `silent` keeps the current data on screen without a loading state. */
  refetch: (opts?: { silent?: boolean }) => void;
  /** Local update for optimistic UI (e.g. a status change), without refetching. */
  setData: (updater: (prev: T | null) => T | null) => void;
};

/**
 * GET `url` with an AbortController; re-fetches when the URL changes. Pass `fetcher` to use one of
 * the typed api-client functions (it receives the abort signal). `url = null` skips the request.
 */
export function useApi<T>(url: string | null, fetcher?: (signal: AbortSignal) => Promise<T>): UseApiResult<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(url !== null);
  const [nonce, setNonce] = useState(0);
  const silentRef = useRef(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (url === null) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    if (!silentRef.current) setLoading(true);
    silentRef.current = false;
    setError(null);

    const run = fetcherRef.current ?? ((signal: AbortSignal) => request<T>(url, { signal }));
    run(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setDataState(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(toApiError(err));
        setLoading(false);
      });

    return () => controller.abort();
  }, [url, nonce]);

  const refetch = useCallback((opts?: { silent?: boolean }) => {
    silentRef.current = Boolean(opts?.silent);
    setNonce((n) => n + 1);
  }, []);

  const setData = useCallback((updater: (prev: T | null) => T | null) => setDataState(updater), []);

  return { data, error, loading, refetch, setData };
}
