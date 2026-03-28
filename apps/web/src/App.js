import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSSE } from "./useSSE";
import { useState } from "react";
const SSE_URL = import.meta.env.VITE_SSE_URL || "http://localhost:3001/api/stream";
const SSE_EVENTS = ["stock-update", "news", "heartbeat"];
export function App() {
    const { data, isConnected, error, history, reconnectCount, disconnect, reconnect } = useSSE({
        url: SSE_URL,
        events: SSE_EVENTS,
    });
    const [stocks, setStocks] = useState({});
    if (data && "symbol" in data && stocks[data.symbol]?.timestamp !== data.timestamp) {
        setStocks((prev) => ({ ...prev, [data.symbol]: data }));
    }
    return (_jsxs("div", { style: {
            fontFamily: "monospace",
            padding: 20,
            background: "#0a0a0a",
            color: "#eee",
            minHeight: "100vh",
        }, children: [_jsx("h1", { style: { color: "#4ade80" }, children: "SSE Stock Dashboard" }), _jsxs("div", { style: {
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                }, children: [_jsx("span", { style: {
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: isConnected ? "#4ade80" : "#ef4444",
                        } }), _jsxs("span", { children: [isConnected
                                ? "Connected to SSE stream"
                                : error || "Disconnected", reconnectCount > 0 && !isConnected && (_jsxs("span", { style: { color: "#888", marginLeft: 8 }, children: ["(reconnects: ", reconnectCount, ")"] }))] }), _jsx("button", { onClick: isConnected ? disconnect : reconnect, style: {
                            padding: "4px 12px",
                            background: isConnected ? "#ef4444" : "#4ade80",
                            color: "#000",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontFamily: "monospace",
                            fontSize: 12,
                        }, children: isConnected ? "Disconnect" : "Reconnect" })] }), _jsx("h2", { children: "Live Prices (updated via SSE)" }), Object.keys(stocks).length === 0 ? (_jsx("p", { style: { color: "#888" }, children: "Waiting for data..." })) : (_jsxs("table", { style: { borderCollapse: "collapse", width: "100%", maxWidth: 600 }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: "1px solid #333" }, children: [_jsx("th", { style: { padding: 8, textAlign: "left" }, children: "Symbol" }), _jsx("th", { style: { padding: 8, textAlign: "right" }, children: "Price" }), _jsx("th", { style: { padding: 8, textAlign: "right" }, children: "Change" }), _jsx("th", { style: { padding: 8, textAlign: "right" }, children: "Time" })] }) }), _jsx("tbody", { children: Object.values(stocks).map((stock) => (_jsxs("tr", { style: { borderBottom: "1px solid #222" }, children: [_jsx("td", { style: { padding: 8, fontWeight: "bold" }, children: stock.symbol }), _jsxs("td", { style: { padding: 8, textAlign: "right" }, children: ["$", stock.price.toFixed(2)] }), _jsxs("td", { style: {
                                        padding: 8,
                                        textAlign: "right",
                                        color: stock.change >= 0 ? "#4ade80" : "#ef4444",
                                    }, children: [stock.change >= 0 ? "+" : "", stock.change.toFixed(2)] }), _jsx("td", { style: { padding: 8, textAlign: "right", color: "#888" }, children: new Date(stock.timestamp).toLocaleTimeString() })] }, stock.symbol))) })] })), _jsx("h2", { style: { marginTop: 30 }, children: "Event Stream (raw SSE events)" }), _jsx("div", { style: {
                    maxHeight: 300,
                    overflow: "auto",
                    background: "#111",
                    border: "1px solid #333",
                    borderRadius: 4,
                    padding: 10,
                }, children: history.length === 0 ? (_jsx("p", { style: { color: "#666", margin: 0, fontSize: 12 }, children: "No events yet..." })) : (history.map((item, i) => (_jsxs("div", { style: { marginBottom: 4, fontSize: 12 }, children: [_jsx("span", { style: { color: "#888" }, children: item.time.toLocaleTimeString() }), " ", _jsxs("span", { style: {
                                color: item.event === "stock-update"
                                    ? "#60a5fa"
                                    : item.event === "news"
                                        ? "#fbbf24"
                                        : "#666",
                            }, children: ["[", item.event, "]"] }), " ", _jsx("span", { children: JSON.stringify(item.data) })] }, i)))) })] }));
}
