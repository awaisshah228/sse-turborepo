"use client";

import { useWorker } from "./useWorker";
import { useState } from "react";

export default function WorkerDemo() {
  const worker = useWorker("/heavy-worker.js");
  const [counter, setCounter] = useState(0);

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ color: "#60a5fa" }}>Web Worker in Next.js</h1>

      {/* UI Responsiveness Test */}
      <div
        style={{
          marginBottom: 20,
          padding: 12,
          background: "#111",
          borderRadius: 4,
          border: "1px solid #333",
        }}
      >
        <h3 style={{ margin: "0 0 8px" }}>UI Responsiveness Test</h3>
        <p style={{ color: "#888", margin: "0 0 8px" }}>
          Click this button while a worker task is running. If the UI is NOT
          blocked, the counter updates instantly.
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

      {/* Error Display */}
      {worker.error && (
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            background: "#2f0f0f",
            border: "1px solid #ef4444",
            borderRadius: 4,
          }}
        >
          <h3 style={{ color: "#ef4444", margin: "0 0 8px" }}>Error</h3>
          <p style={{ margin: 0, fontSize: 13 }}>{worker.error}</p>
          <button
            onClick={worker.reset}
            style={{
              marginTop: 8,
              padding: "4px 12px",
              background: "#333",
              color: "#eee",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {worker.status === "running" && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              background: "#222",
              borderRadius: 4,
              overflow: "hidden",
              height: 24,
            }}
          >
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
          <p style={{ color: "#888", fontSize: 12 }}>
            {worker.progressMessage}
          </p>
        </div>
      )}

      {/* Result Display */}
      {worker.result && (
        <div
          style={{
            marginBottom: 20,
            padding: 12,
            background: "#0f2f1a",
            border: "1px solid #4ade80",
            borderRadius: 4,
          }}
        >
          <h3 style={{ color: "#4ade80", margin: "0 0 8px" }}>Result</h3>
          <pre style={{ margin: 0, fontSize: 13 }}>
            {JSON.stringify(worker.result, null, 2)}
          </pre>
        </div>
      )}

      {/* Task Buttons */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <TaskCard
          title="Find Primes"
          description="Find all prime numbers up to 500,000. Heavy CPU work — but UI stays responsive!"
          color="#60a5fa"
          disabled={worker.status === "running"}
          onClick={() => worker.run("find-primes", { limit: 500000 })}
          status={worker.status}
        />
        <TaskCard
          title="Sort 5M Numbers"
          description="Generate and sort 5 million random numbers. Try clicking the counter while this runs!"
          color="#fbbf24"
          disabled={worker.status === "running"}
          onClick={() => worker.run("sort-array", { size: 5000000 })}
          status={worker.status}
        />
        <TaskCard
          title="Process 4K Image"
          description="Simulate grayscale filter on 3840x2160 pixels (8.3M pixels). Worker keeps UI smooth."
          color="#c084fc"
          disabled={worker.status === "running"}
          onClick={() =>
            worker.run("process-data", { width: 3840, height: 2160 })
          }
          status={worker.status}
        />
      </div>
    </div>
  );
}

function TaskCard({
  title,
  description,
  color,
  disabled,
  onClick,
  status,
}: {
  title: string;
  description: string;
  color: string;
  disabled: boolean;
  onClick: () => void;
  status: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        background: "#111",
        borderRadius: 8,
        border: "1px solid #333",
      }}
    >
      <h3 style={{ color, margin: "0 0 8px" }}>{title}</h3>
      <p style={{ color: "#888", fontSize: 12, margin: "0 0 12px" }}>
        {description}
      </p>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: "8px 16px",
          background: disabled ? "#333" : color,
          color: disabled ? "#888" : "#000",
          border: "none",
          borderRadius: 4,
          cursor: disabled ? "not-allowed" : "pointer",
          fontFamily: "monospace",
        }}
      >
        {status === "running" ? "Running..." : "Start"}
      </button>
    </div>
  );
}
