import { useSSE } from "./useSSE";
import type { StockPrice } from "@repo/shared";
import { useState } from "react";

// ============================================
// SSE FLOW VISUALIZED:
//
// Express Server (port 3001)          React Client (port 3000)
// ┌─────────────────┐                ┌──────────────────┐
// │                 │   GET /stream  │                  │
// │  res.setHeader  │◄───────────────│  new EventSource │
// │  "text/event-   │                │  (url)           │
// │   stream"       │                │                  │
// │                 │ ──────────────►│                  │
// │  res.write(     │  data: {...}   │  onmessage /     │
// │    "data:..."   │  event: name   │  addEventListener│
// │  )              │ ──────────────►│  → setState()    │
// │                 │  data: {...}   │  → re-render     │
// │  setInterval()  │ ──────────────►│                  │
// │  pushes data    │  data: {...}   │  Auto-reconnect  │
// │  continuously   │                │  on disconnect   │
// └─────────────────┘                └──────────────────┘
// ============================================

const SSE_EVENTS = ["stock-update", "news", "heartbeat"];

export function App() {
  const { data, isConnected, error, history } = useSSE<StockPrice>({
    url: "http://localhost:3001/api/stream",
    events: SSE_EVENTS,
  });

  const [stocks, setStocks] = useState<Record<string, StockPrice>>({});

  // Update stock map when new data arrives
  if (data && "symbol" in data && stocks[data.symbol]?.timestamp !== data.timestamp) {
    setStocks((prev) => ({ ...prev, [data.symbol]: data }));
  }

  return (
    <div style={{ fontFamily: "monospace", padding: 20, background: "#0a0a0a", color: "#eee", minHeight: "100vh" }}>
      <h1 style={{ color: "#4ade80" }}>SSE Stock Dashboard</h1>

      {/* Connection Status */}
      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isConnected ? "#4ade80" : "#ef4444",
            marginRight: 8,
          }}
        />
        {isConnected ? "Connected to SSE stream" : error || "Disconnected"}
      </div>

      {/* Stock Prices Table */}
      <h2>Live Prices (updated via SSE)</h2>
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: 600 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ padding: 8, textAlign: "left" }}>Symbol</th>
            <th style={{ padding: 8, textAlign: "right" }}>Price</th>
            <th style={{ padding: 8, textAlign: "right" }}>Change</th>
            <th style={{ padding: 8, textAlign: "right" }}>Time</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(stocks).map((stock) => (
            <tr key={stock.symbol} style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: 8, fontWeight: "bold" }}>{stock.symbol}</td>
              <td style={{ padding: 8, textAlign: "right" }}>${stock.price.toFixed(2)}</td>
              <td
                style={{
                  padding: 8,
                  textAlign: "right",
                  color: stock.change >= 0 ? "#4ade80" : "#ef4444",
                }}
              >
                {stock.change >= 0 ? "+" : ""}
                {stock.change.toFixed(2)}
              </td>
              <td style={{ padding: 8, textAlign: "right", color: "#888" }}>
                {new Date(stock.timestamp).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Event History */}
      <h2 style={{ marginTop: 30 }}>Event Stream (raw SSE events)</h2>
      <div
        style={{
          maxHeight: 300,
          overflow: "auto",
          background: "#111",
          border: "1px solid #333",
          borderRadius: 4,
          padding: 10,
        }}
      >
        {history.map((item, i) => (
          <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
            <span style={{ color: "#888" }}>{item.time.toLocaleTimeString()}</span>{" "}
            <span
              style={{
                color:
                  item.event === "stock-update" ? "#60a5fa" : item.event === "news" ? "#fbbf24" : "#666",
              }}
            >
              [{item.event}]
            </span>{" "}
            <span>{JSON.stringify(item.data)}</span>
          </div>
        ))}
      </div>

      {/* How it works section */}
      <div style={{ marginTop: 30, padding: 16, background: "#111", borderRadius: 4, border: "1px solid #333" }}>
        <h3>How SSE Works:</h3>
        <pre style={{ fontSize: 12, color: "#888", whiteSpace: "pre-wrap" }}>
{`1. Browser: new EventSource("http://localhost:3001/api/stream")
   → sends GET request, keeps connection open

2. Server: res.setHeader("Content-Type", "text/event-stream")
   → tells browser "this is a stream, don't close"

3. Server: res.write("event: stock-update\\ndata: {...}\\n\\n")
   → pushes data whenever it wants (every 1 second here)

4. Browser: eventSource.addEventListener("stock-update", handler)
   → receives each push and triggers React re-render

5. If connection drops → EventSource auto-reconnects!

Key difference from WebSocket:
- SSE = one-way (server → client only)
- WebSocket = two-way (both can send)
- SSE = plain HTTP (works through proxies/firewalls)
- SSE = auto-reconnect built-in`}
        </pre>
      </div>
    </div>
  );
}
