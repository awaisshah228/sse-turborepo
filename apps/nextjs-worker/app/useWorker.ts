"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type WorkerStatus = "idle" | "running" | "done" | "error";

interface WorkerState {
  status: WorkerStatus;
  progress: number;
  progressMessage: string;
  result: Record<string, unknown> | null;
  error: string | null;
}

export function useWorker(workerPath: string) {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<WorkerState>({
    status: "idle",
    progress: 0,
    progressMessage: "",
    result: null,
    error: null,
  });

  useEffect(() => {
    // Check for Worker support (SSR safety)
    if (typeof window === "undefined" || !window.Worker) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: "Web Workers are not supported in this environment",
      }));
      return;
    }

    const worker = new Worker(workerPath);
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case "progress":
          setState((prev) => ({
            ...prev,
            progress: payload.percent ?? prev.progress,
            progressMessage: payload.message ?? `${payload.percent}% complete`,
          }));
          break;

        case "primes-result":
        case "sort-result":
        case "data-result":
          setState({
            status: "done",
            progress: 100,
            progressMessage: "Complete!",
            result: payload,
            error: null,
          });
          break;

        case "error":
          setState((prev) => ({
            ...prev,
            status: "error",
            error: payload,
          }));
          break;
      }
    };

    worker.onerror = (err) => {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err.message || "Worker encountered an error",
      }));
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [workerPath]);

  const run = useCallback((type: string, payload: Record<string, unknown>) => {
    if (!workerRef.current) return;
    setState({
      status: "running",
      progress: 0,
      progressMessage: "Starting...",
      result: null,
      error: null,
    });
    workerRef.current.postMessage({ type, payload });
  }, []);

  const reset = useCallback(() => {
    setState({
      status: "idle",
      progress: 0,
      progressMessage: "",
      result: null,
      error: null,
    });
  }, []);

  return { ...state, run, reset };
}
