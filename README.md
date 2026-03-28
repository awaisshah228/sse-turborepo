# SSE Turborepo

A monorepo demonstrating **Server-Sent Events (SSE)** and **Web Workers** in a real-time stock dashboard, built with Turborepo.

## Architecture

```
sse-turborepo/
├── apps/
│   ├── api/          — Express SSE server (stock prices, news, heartbeats)
│   ├── web/          — Vite + React client (SSE stock dashboard)
│   └── nextjs-worker/ — Next.js app with Web Workers (CPU-heavy tasks)
└── packages/
    └── shared/       — Shared TypeScript types (StockPrice, events)
```

## How It Works

### SSE Flow (api + web)

1. **api** runs an Express server that broadcasts stock price updates, news headlines, and heartbeats via SSE on `/api/stream`
2. **web** connects to the SSE endpoint using a custom `useSSE` hook and renders a live stock price table and event stream

### Web Worker Flow (nextjs-worker)

1. A Web Worker (`heavy-worker.js`) runs CPU-intensive tasks (prime finding, sorting, image processing) off the main thread
2. The `useWorker` hook manages the worker lifecycle and communicates via `postMessage` — sending tasks and receiving progress/results

## Getting Started

```bash
# Install dependencies
yarn

# Run all apps in development
yarn dev
```

| App | URL |
|-----|-----|
| api | http://localhost:3001 |
| web | http://localhost:3000 |
| nextjs-worker | http://localhost:3002 |

## Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start all apps in dev mode (via Turborepo) |
| `yarn build` | Build all apps and packages |

## Tech Stack

- **Turborepo** — monorepo orchestration with task caching
- **Express** — SSE server with graceful shutdown
- **Vite + React 19** — SSE client dashboard
- **Next.js 15** — Web Worker demo with Turbopack
- **TypeScript** — shared types across all packages
