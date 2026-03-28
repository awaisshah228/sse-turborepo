// Web Worker — runs in a separate browser thread

self.onmessage = function (event) {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case "find-primes": {
        const { limit } = payload;
        if (!limit || limit < 2) {
          self.postMessage({ type: "error", payload: "Invalid limit — must be >= 2" });
          return;
        }

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

        self.postMessage({
          type: "primes-result",
          payload: {
            count: primes.length,
            last10: primes.slice(-10),
            elapsed: Math.round(performance.now() - startTime),
          },
        });
        break;
      }

      case "sort-array": {
        const { size } = payload;
        if (!size || size < 1) {
          self.postMessage({ type: "error", payload: "Invalid size — must be >= 1" });
          return;
        }

        const startTime = performance.now();
        const arr = Array.from({ length: size }, () => Math.random() * 1000000);

        self.postMessage({
          type: "progress",
          payload: { percent: 30, message: "Array generated, sorting..." },
        });

        arr.sort((a, b) => a - b);

        self.postMessage({
          type: "progress",
          payload: { percent: 80, message: "Sorted, computing stats..." },
        });

        self.postMessage({
          type: "sort-result",
          payload: {
            size: arr.length,
            min: arr[0],
            max: arr[arr.length - 1],
            median: arr[Math.floor(arr.length / 2)],
            elapsed: Math.round(performance.now() - startTime),
          },
        });
        break;
      }

      case "process-data": {
        const { width, height } = payload;
        if (!width || !height || width < 1 || height < 1) {
          self.postMessage({ type: "error", payload: "Invalid dimensions" });
          return;
        }

        const startTime = performance.now();
        const totalPixels = width * height;
        const data = new Float32Array(totalPixels * 4);

        for (let i = 0; i < totalPixels; i++) {
          const r = Math.random() * 255;
          const g = Math.random() * 255;
          const b = Math.random() * 255;
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i * 4] = gray;
          data[i * 4 + 1] = gray;
          data[i * 4 + 2] = gray;
          data[i * 4 + 3] = 255;

          if (i % 500000 === 0) {
            self.postMessage({
              type: "progress",
              payload: {
                percent: Math.round((i / totalPixels) * 100),
                message: `Processing pixel ${i.toLocaleString()}/${totalPixels.toLocaleString()}`,
              },
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
  } catch (err) {
    self.postMessage({
      type: "error",
      payload: err instanceof Error ? err.message : "Worker encountered an unexpected error",
    });
  }
};
