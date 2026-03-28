# @repo/web

Vite + React client that displays a **live stock dashboard** powered by Server-Sent Events.

## Features

- Real-time stock price table updated via SSE
- Connection status indicator with reconnect/disconnect controls
- Raw event stream viewer showing all SSE events
- Auto-reconnect on connection loss

## How It Works

The `useSSE` hook connects to the API's `/api/stream` endpoint and listens for named events (`stock-update`, `news`, `heartbeat`). Stock prices are rendered in a live table with color-coded price changes.

## Running

```bash
# From monorepo root
yarn dev

# Or standalone
cd apps/web
yarn dev    # starts on http://localhost:3000
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SSE_URL` | `http://localhost:3001/api/stream` | SSE endpoint URL |
