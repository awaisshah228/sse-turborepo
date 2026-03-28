import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { STOCKS, type StockPrice } from "@repo/shared";

const app = express();
app.use(cors());

// Store connected SSE clients
const clients: Set<Response> = new Set();

// ============================================
// SSE ENDPOINT — This is the key part!
// ============================================
// How SSE works:
// 1. Client sends a regular GET request
// 2. Server sets special headers to keep connection open
// 3. Server sends "data: ...\n\n" formatted messages
// 4. Connection stays open — server pushes data whenever it wants
// 5. Client receives events via EventSource API
// ============================================

app.get("/api/stream", (req: Request, res: Response) => {
  // Step 1: Set SSE headers
  // These headers tell the browser:
  // - "text/event-stream" = this is an SSE connection
  // - "no-cache" = don't cache this response
  // - "keep-alive" = keep the TCP connection open
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Step 2: Flush headers immediately (starts the stream)
  res.flushHeaders();

  // Step 3: Send initial connection message
  // SSE format: "data: <json>\n\n" (double newline = end of message)
  res.write(`data: ${JSON.stringify({ type: "connected", message: "SSE stream started!" })}\n\n`);

  // Step 4: Add this client to our set
  clients.add(res);
  console.log(`Client connected. Total clients: ${clients.size}`);

  // Step 5: Clean up when client disconnects
  req.on("close", () => {
    clients.delete(res);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });
});

// ============================================
// SIMULATE REAL-TIME STOCK DATA
// ============================================
// Every second, generate random stock prices
// and push them to ALL connected clients

const stockPrices: Record<string, number> = {
  AAPL: 178.5,
  GOOGL: 141.2,
  MSFT: 378.9,
  AMZN: 185.6,
  TSLA: 248.3,
};

function generateStockUpdate(): StockPrice {
  // Pick a random stock
  const symbol = STOCKS[Math.floor(Math.random() * STOCKS.length)];
  // Random price change between -2% and +2%
  const change = (Math.random() - 0.5) * 4;
  stockPrices[symbol] += change;

  return {
    symbol,
    price: Math.round(stockPrices[symbol] * 100) / 100,
    change: Math.round(change * 100) / 100,
    timestamp: Date.now(),
  };
}

// Broadcast to all connected clients
function broadcast(eventName: string, data: unknown) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  //                ↑ event name          ↑ JSON payload    ↑ double newline = end

  for (const client of clients) {
    client.write(message);
  }
}

// Send stock updates every second
setInterval(() => {
  const update = generateStockUpdate();
  broadcast("stock-update", update);
}, 1000);

// Send a heartbeat every 15 seconds (keeps connection alive)
setInterval(() => {
  broadcast("heartbeat", { time: Date.now() });
}, 15000);

// Also send news headlines every 10 seconds
const headlines = [
  "Fed signals potential rate cut in Q3",
  "Tech stocks rally on AI earnings beat",
  "Oil prices drop amid supply concerns",
  "Crypto market sees renewed institutional interest",
  "Housing market shows signs of cooling",
];

setInterval(() => {
  const headline = headlines[Math.floor(Math.random() * headlines.length)];
  broadcast("news", { headline, timestamp: Date.now() });
}, 10000);

// REST endpoint for comparison
app.get("/api/stocks", (_req: Request, res: Response) => {
  res.json(stockPrices);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/api/stream`);
});
