"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ============================================
// CUSTOM HOOK: useWorker
// ============================================
// Manages Web Worker lifecycle in React:
// 1. Creates worker on mount
// 2. Provides postMessage function
// 3. Tracks progress and results
// 4. Terminates worker on unmount
// ============================================

interface WorkerState {
  status: "idle" | "running" | "done" | "error";
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
    // Create worker (runs in separate thread)
    const worker = new Worker(workerPath);
    workerRef.current = worker;

    // Listen for messages FROM the worker
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
        error: err.message,
      }));
    };

    // Cleanup: terminate worker when component unmounts
    return () => {
      worker.terminate();
    };
  }, [workerPath]);

  // Send a task TO the worker
  const run = useCallback((type: string, payload: Record<string, unknown>) => {
    setState({
      status: "running",
      progress: 0,
      progressMessage: "Starting...",
      result: null,
      error: null,
    });
    workerRef.current?.postMessage({ type, payload });
  }, []);

  return { ...state, run };
}
