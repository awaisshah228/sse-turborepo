import express from "express";
import cors from "cors";
import type { Request, Response } from "express";
import { STOCKS, type StockPrice } from "@repo/shared";

const app = express();

const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime(), clients: clients.size });
});

// Store connected SSE clients
const clients: Set<Response> = new Set();

app.get("/api/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  res.flushHeaders();

  // Send retry directive so clients reconnect after 3s on disconnect
  res.write("retry: 3000\n\n");
  res.write(
    `data: ${JSON.stringify({ type: "connected", message: "SSE stream started!" })}\n\n`
  );

  clients.add(res);
  console.log(`Client connected. Total clients: ${clients.size}`);

  req.on("close", () => {
    clients.delete(res);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });
});

// Stock price state
const stockPrices: Record<string, number> = {
  AAPL: 178.5,
  GOOGL: 141.2,
  MSFT: 378.9,
  AMZN: 185.6,
  TSLA: 248.3,
};

let eventId = 0;

function generateStockUpdate(): StockPrice {
  const symbol = STOCKS[Math.floor(Math.random() * STOCKS.length)];
  const change = (Math.random() - 0.5) * 4;
  stockPrices[symbol] += change;

  return {
    symbol,
    price: Math.round(stockPrices[symbol] * 100) / 100,
    change: Math.round(change * 100) / 100,
    timestamp: Date.now(),
  };
}

function broadcast(eventName: string, data: unknown) {
  eventId++;
  const message = `id: ${eventId}\nevent: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    const ok = client.write(message);
    if (!ok) {
      // Client can't keep up — remove it
      clients.delete(client);
      client.end();
    }
  }
}

// Intervals to track for graceful shutdown
const intervals: NodeJS.Timeout[] = [];

intervals.push(
  setInterval(() => {
    const update = generateStockUpdate();
    broadcast("stock-update", update);
  }, 1000)
);

intervals.push(
  setInterval(() => {
    broadcast("heartbeat", { time: Date.now() });
  }, 15000)
);

const headlines = [
  "Fed signals potential rate cut in Q3",
  "Tech stocks rally on AI earnings beat",
  "Oil prices drop amid supply concerns",
  "Crypto market sees renewed institutional interest",
  "Housing market shows signs of cooling",
];

intervals.push(
  setInterval(() => {
    const headline = headlines[Math.floor(Math.random() * headlines.length)];
    broadcast("news", { headline, timestamp: Date.now() });
  }, 10000)
);

app.get("/api/stocks", (_req: Request, res: Response) => {
  res.json(stockPrices);
});

const PORT = parseInt(process.env.PORT || "3001", 10);
const server = app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/api/stream`);
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // Stop broadcasting
  for (const interval of intervals) clearInterval(interval);

  // Close all SSE connections
  for (const client of clients) {
    client.write(
      `event: server-shutdown\ndata: ${JSON.stringify({ message: "Server shutting down" })}\n\n`
    );
    client.end();
  }
  clients.clear();

  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });

  // Force exit after 5s
  setTimeout(() => process.exit(1), 5000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
