"use client";

import { useWorker } from "./useWorker";
import { useState } from "react";

// ============================================
// WEB WORKER IN NEXT.JS — HOW IT WORKS
// ============================================
//
// Problem: Heavy computation blocks the UI
// ┌─────────────────────────────────────┐
// │  Main Thread (without worker)       │
// │  ┌──────┬──────────────┬──────┐     │
// │  │ UI   │ HEAVY CALC   │ UI   │     │
// │  │ work │ (BLOCKED!)   │ work │     │
// │  └──────┴──────────────┴──────┘     │
// │  User can't click, scroll, type!    │
// └─────────────────────────────────────┘
//
// Solution: Move heavy work to a Worker
// ┌─────────────────────────────────────┐
// │  Main Thread                        │
// │  ┌──────┬──────┬──────┬──────┐      │
// │  │ UI   │ UI   │ UI   │ UI   │      │
// │  │ work │ work │ work │ work │      │
// │  └──────┴──────┴──────┴──────┘      │
// │        ↕ postMessage ↕              │
// │  ┌──────────────────────────┐       │
// │  │ Worker Thread            │       │
// │  │ HEAVY CALC (no blocking!)│       │
// │  └──────────────────────────┘       │
// │  User can still interact!           │
// └─────────────────────────────────────┘
// ============================================

export default function WorkerDemo() {
  const worker = useWorker("/heavy-worker.js");
  const [counter, setCounter] = useState(0);

  // This counter proves the UI stays responsive during heavy work
  const uiResponsive = (
    <div style={{ marginBottom: 20, padding: 12, background: "#111", borderRadius: 4, border: "1px solid #333" }}>
      <h3 style={{ margin: "0 0 8px" }}>UI Responsiveness Test</h3>
      <p style={{ color: "#888", margin: "0 0 8px" }}>
        Click this button while a worker task is running. If the UI is NOT blocked, the counter updates instantly.
      </p>
      <button
        onClick={() => setCounter((c) => c + 1)}
        style={{
          padding: "8px 16px",
          background: "#4ade80",
          color: "#000",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontFamily: "monospace",
          fontWeight: "bold",
        }}
      >
        Clicks: {counter}
      </button>
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#60a5fa" }}>Web Worker in Next.js</h1>

      {uiResponsive}

      {/* Progress Bar */}
      {worker.status === "running" && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ background: "#222", borderRadius: 4, overflow: "hidden", height: 24 }}>
            <div
              style={{
                width: `${worker.progress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                transition: "width 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              {worker.progress}%
            </div>
          </div>
          <p style={{ color: "#888", fontSize: 12 }}>{worker.progressMessage}</p>
        </div>
      )}

      {/* Result Display */}
      {worker.result && (
        <div style={{ marginBottom: 20, padding: 12, background: "#0f2f1a", border: "1px solid #4ade80", borderRadius: 4 }}>
          <h3 style={{ color: "#4ade80", margin: "0 0 8px" }}>Result</h3>
          <pre style={{ margin: 0, fontSize: 13 }}>{JSON.stringify(worker.result, null, 2)}</pre>
        </div>
      )}

      {/* Task Buttons */}
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr 1fr" }}>
        {/* Task 1: Find Primes */}
        <div style={{ padding: 16, background: "#111", borderRadius: 8, border: "1px solid #333" }}>
          <h3 style={{ color: "#60a5fa", margin: "0 0 8px" }}>Find Primes</h3>
          <p style={{ color: "#888", fontSize: 12, margin: "0 0 12px" }}>
            Find all prime numbers up to 500,000. Heavy CPU work — but UI stays responsive!
          </p>
          <button
            onClick={() => worker.run("find-primes", { limit: 500000 })}
            disabled={worker.status === "running"}
            style={{
              padding: "8px 16px",
              background: worker.status === "running" ? "#333" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: worker.status === "running" ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {worker.status === "running" ? "Running..." : "Start"}
          </button>
        </div>

        {/* Task 2: Sort Array */}
        <div style={{ padding: 16, background: "#111", borderRadius: 8, border: "1px solid #333" }}>
          <h3 style={{ color: "#fbbf24", margin: "0 0 8px" }}>Sort 5M Numbers</h3>
          <p style={{ color: "#888", fontSize: 12, margin: "0 0 12px" }}>
            Generate and sort 5 million random numbers. Try clicking the counter while this runs!
          </p>
          <button
            onClick={() => worker.run("sort-array", { size: 5000000 })}
            disabled={worker.status === "running"}
            style={{
              padding: "8px 16px",
              background: worker.status === "running" ? "#333" : "#fbbf24",
              color: "#000",
              border: "none",
              borderRadius: 4,
              cursor: worker.status === "running" ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {worker.status === "running" ? "Running..." : "Start"}
          </button>
        </div>

        {/* Task 3: Process Data */}
        <div style={{ padding: 16, background: "#111", borderRadius: 8, border: "1px solid #333" }}>
          <h3 style={{ color: "#c084fc", margin: "0 0 8px" }}>Process 4K Image</h3>
          <p style={{ color: "#888", fontSize: 12, margin: "0 0 12px" }}>
            Simulate grayscale filter on 3840x2160 pixels (8.3M pixels). Worker keeps UI smooth.
          </p>
          <button
            onClick={() => worker.run("process-data", { width: 3840, height: 2160 })}
            disabled={worker.status === "running"}
            style={{
              padding: "8px 16px",
              background: worker.status === "running" ? "#333" : "#c084fc",
              color: "#000",
              border: "none",
              borderRadius: 4,
              cursor: worker.status === "running" ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            {worker.status === "running" ? "Running..." : "Start"}
          </button>
        </div>
      </div>

      {/* How Workers Work Explanation */}
      <div style={{ marginTop: 30, padding: 16, background: "#111", borderRadius: 8, border: "1px solid #333" }}>
        <h3>How Web Workers Work in Next.js:</h3>
        <pre style={{ fontSize: 11, color: "#888", whiteSpace: "pre-wrap" }}>
{`1. Worker file lives in /public/heavy-worker.js
   → Next.js serves it as a static file
   → Worker code runs in a SEPARATE browser thread

2. Main thread creates worker:
   const worker = new Worker("/heavy-worker.js")

3. Send task to worker (main → worker):
   worker.postMessage({ type: "find-primes", payload: { limit: 500000 } })

4. Worker receives and processes:
   self.onmessage = (event) => {
     // heavy computation here — doesn't block UI!
     self.postMessage({ type: "result", payload: result })
   }

5. Main thread receives result (worker → main):
   worker.onmessage = (event) => {
     setState(event.data) // triggers React re-render
   }

Key rules:
- Workers can't access DOM (no document, no window)
- Communication is via postMessage only (serialized data)
- Workers CAN use: fetch, WebSocket, IndexedDB, crypto
- Each worker = separate thread = separate memory
- Use worker.terminate() to kill it when done`}
        </pre>
      </div>
    </div>
  );
}
