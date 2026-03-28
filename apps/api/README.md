# @repo/api

Express server that broadcasts real-time stock data via **Server-Sent Events (SSE)**.

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/stream` | SSE stream — emits `stock-update`, `news`, and `heartbeat` events |
| `GET /api/stocks` | JSON snapshot of current stock prices |
| `GET /health` | Health check with uptime and connected client count |

## SSE Events

- **`stock-update`** (every 1s) — random price movement for AAPL, GOOGL, MSFT, AMZN, TSLA
- **`news`** (every 10s) — random headline from a preset list
- **`heartbeat`** (every 15s) — keep-alive with timestamp

## Running

```bash
# From monorepo root
yarn dev

# Or standalone
cd apps/api
yarn dev    # starts on http://localhost:3001
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Comma-separated allowed origins |
