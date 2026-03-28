// ============================================
// WEB WORKER — Runs in a SEPARATE THREAD
// ============================================
// Why use a Web Worker?
// - JavaScript is single-threaded (one thread for UI + logic)
// - Heavy computation BLOCKS the UI (freezes the page)
// - Web Worker runs code in a BACKGROUND THREAD
// - Main thread stays responsive while worker crunches numbers
//
// Communication:
// Main Thread          Worker Thread
// ┌──────────┐        ┌──────────┐
// │          │ post   │          │
// │  post    │───────►│ onmessage│  ← receives task
// │  Message │        │          │
// │          │        │ process  │  ← does heavy work
// │          │        │ ...      │
// │          │  post  │          │
// │ onmessage│◄───────│ post     │  ← sends result back
// │          │        │ Message  │
// │ update   │        │          │
// │ React UI │        │          │
// └──────────┘        └──────────┘
// ============================================

// Listen for messages from main thread
self.onmessage = function (event) {
  const { type, payload } = event.data;

  switch (type) {
    // ---- Example 1: Find prime numbers (CPU-heavy) ----
    case "find-primes": {
      const { limit } = payload;
      const primes = [];
      const startTime = performance.now();

      for (let num = 2; num <= limit; num++) {
        let isPrime = true;
        for (let i = 2; i * i <= num; i++) {
          if (num % i === 0) {
            isPrime = false;
            break;
          }
        }
        if (isPrime) primes.push(num);

        // Send progress updates every 10000 numbers
        if (num % 10000 === 0) {
          self.postMessage({
            type: "progress",
            payload: {
              current: num,
              total: limit,
              percent: Math.round((num / limit) * 100),
              primesFound: primes.length,
            },
          });
        }
      }

      const elapsed = performance.now() - startTime;
      self.postMessage({
        type: "primes-result",
        payload: {
          count: primes.length,
          last10: primes.slice(-10),
          elapsed: Math.round(elapsed),
        },
      });
      break;
    }

    // ---- Example 2: Sort a massive array ----
    case "sort-array": {
      const { size } = payload;
      const startTime = performance.now();

      // Generate random array
      const arr = Array.from({ length: size }, () => Math.random() * 1000000);

      self.postMessage({ type: "progress", payload: { percent: 30, message: "Array generated, sorting..." } });

      // Sort it (CPU intensive for large arrays)
      arr.sort((a, b) => a - b);

      self.postMessage({ type: "progress", payload: { percent: 80, message: "Sorted, computing stats..." } });

      // Compute stats
      const result = {
        size: arr.length,
        min: arr[0],
        max: arr[arr.length - 1],
        median: arr[Math.floor(arr.length / 2)],
        elapsed: Math.round(performance.now() - startTime),
      };

      self.postMessage({ type: "sort-result", payload: result });
      break;
    }

    // ---- Example 3: Image-like data processing ----
    case "process-data": {
      const { width, height } = payload;
      const startTime = performance.now();
      const totalPixels = width * height;

      // Simulate image filter (grayscale conversion)
      const data = new Float32Array(totalPixels * 4); // RGBA
      for (let i = 0; i < totalPixels; i++) {
        const r = Math.random() * 255;
        const g = Math.random() * 255;
        const b = Math.random() * 255;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i * 4] = gray;     // R
        data[i * 4 + 1] = gray; // G
        data[i * 4 + 2] = gray; // B
        data[i * 4 + 3] = 255;  // A

        if (i % 500000 === 0) {
          self.postMessage({
            type: "progress",
            payload: { percent: Math.round((i / totalPixels) * 100), message: `Processing pixel ${i}/${totalPixels}` },
          });
        }
      }

      self.postMessage({
        type: "data-result",
        payload: {
          pixels: totalPixels,
          elapsed: Math.round(performance.now() - startTime),
          sampleValues: [data[0], data[1], data[2], data[3]],
        },
      });
      break;
    }

    default:
      self.postMessage({ type: "error", payload: `Unknown task: ${type}` });
  }
};
