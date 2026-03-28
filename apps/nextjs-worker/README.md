# @repo/nextjs-worker

Next.js app demonstrating **Web Workers** for CPU-intensive tasks without blocking the UI.

## Features

- **Find Primes** — finds all primes up to 500,000 in a worker thread
- **Sort 5M Numbers** — generates and sorts 5 million random numbers off-thread
- **Process 4K Image** — simulates a grayscale filter on 8.3M pixels
- Real-time progress bar for each task
- UI responsiveness counter to prove the main thread stays unblocked

## How It Works

1. A plain JS Web Worker (`public/heavy-worker.js`) listens for tasks via `self.onmessage`
2. The `useWorker` hook sends tasks with `worker.postMessage({ type, payload })` and receives progress/results back via `worker.onmessage`
3. Communication uses a `{ type, payload }` protocol — the worker posts `progress`, result (`primes-result`, `sort-result`, `data-result`), or `error` messages back to the main thread

## Running

```bash
# From monorepo root
yarn dev

# Or standalone
cd apps/nextjs-worker
yarn dev    # starts on http://localhost:3002
```
