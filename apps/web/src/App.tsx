import { useSSE } from "./useSSE";
import type { StockPrice } from "@repo/shared";
import { useState } from "react";

const SSE_URL = import.meta.env.VITE_SSE_URL || "http://localhost:3001/api/stream";
const SSE_EVENTS = ["stock-update", "news", "heartbeat"];

export function App() {
  const { data, isConnected, error, history, reconnectCount, disconnect, reconnect } =
    useSSE<StockPrice>({
      url: SSE_URL,
      events: SSE_EVENTS,
    });

  const [stocks, setStocks] = useState<Record<string, StockPrice>>({});

  if (data && "symbol" in data && stocks[data.symbol]?.timestamp !== data.timestamp) {
    setStocks((prev) => ({ ...prev, [data.symbol]: data }));
  }

  return (
    <div
      style={{
        fontFamily: "monospace",
        padding: 20,
        background: "#0a0a0a",
        color: "#eee",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ color: "#4ade80" }}>SSE Stock Dashboard</h1>

      {/* Connection Status */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: isConnected ? "#4ade80" : "#ef4444",
          }}
        />
        <span>
          {isConnected
            ? "Connected to SSE stream"
            : error || "Disconnected"}
          {reconnectCount > 0 && !isConnected && (
            <span style={{ color: "#888", marginLeft: 8 }}>
              (reconnects: {reconnectCount})
            </span>
          )}
        </span>
        <button
          onClick={isConnected ? disconnect : reconnect}
          style={{
            padding: "4px 12px",
            background: isConnected ? "#ef4444" : "#4ade80",
            color: "#000",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: 12,
          }}
        >
          {isConnected ? "Disconnect" : "Reconnect"}
        </button>
      </div>

      {/* Stock Prices Table */}
      <h2>Live Prices (updated via SSE)</h2>
      {Object.keys(stocks).length === 0 ? (
        <p style={{ color: "#888" }}>Waiting for data...</p>
      ) : (
        <table
          style={{ borderCollapse: "collapse", width: "100%", maxWidth: 600 }}
        >
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
              <tr
                key={stock.symbol}
                style={{ borderBottom: "1px solid #222" }}
              >
                <td style={{ padding: 8, fontWeight: "bold" }}>
                  {stock.symbol}
                </td>
                <td style={{ padding: 8, textAlign: "right" }}>
                  ${stock.price.toFixed(2)}
                </td>
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
                <td
                  style={{ padding: 8, textAlign: "right", color: "#888" }}
                >
                  {new Date(stock.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
        {history.length === 0 ? (
          <p style={{ color: "#666", margin: 0, fontSize: 12 }}>
            No events yet...
          </p>
        ) : (
          history.map((item, i) => (
            <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: "#888" }}>
                {item.time.toLocaleTimeString()}
              </span>{" "}
              <span
                style={{
                  color:
                    item.event === "stock-update"
                      ? "#60a5fa"
                      : item.event === "news"
                        ? "#fbbf24"
                        : "#666",
                }}
              >
                [{item.event}]
              </span>{" "}
              <span>{JSON.stringify(item.data)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
