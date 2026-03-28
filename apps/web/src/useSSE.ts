import { useEffect, useRef, useState, useCallback } from "react";

// ============================================
// CUSTOM HOOK: useSSE — SSE Client Side
// ============================================
// How EventSource (SSE client) works:
// 1. Browser creates a persistent HTTP connection via new EventSource(url)
// 2. Browser auto-reconnects if connection drops
// 3. You listen for named events with .addEventListener("event-name", handler)
// 4. Each event has a .data property with the JSON string
// 5. Connection is one-way: server → client only
// ============================================

interface UseSSEOptions {
  url: string;
  events: string[]; // which named events to listen for
}

interface SSEState<T> {
  data: T | null;
  lastEvent: string | null;
  isConnected: boolean;
  error: string | null;
  history: Array<{ event: string; data: T; time: Date }>;
}

export function useSSE<T>({ url, events }: UseSSEOptions) {
  const [state, setState] = useState<SSEState<T>>({
    data: null,
    lastEvent: null,
    isConnected: false,
    error: null,
    history: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    // Step 1: Create EventSource — browser opens persistent GET request
    const es = new EventSource(url);
    eventSourceRef.current = es;

    // Step 2: Handle connection open
    es.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
      console.log("SSE Connected!");
    };

    // Step 3: Handle default messages (no event name)
    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        console.log("Default message:", parsed);
      } catch {
        console.log("Raw message:", event.data);
      }
    };

    // Step 4: Listen for NAMED events
    // When server sends "event: stock-update\ndata: {...}\n\n"
    // we catch it with addEventListener("stock-update", ...)
    for (const eventName of events) {
      es.addEventListener(eventName, (event) => {
        try {
          const parsed = JSON.parse(event.data) as T;
          setState((prev) => ({
            ...prev,
            data: parsed,
            lastEvent: eventName,
            history: [
              { event: eventName, data: parsed, time: new Date() },
              ...prev.history.slice(0, 49), // keep last 50
            ],
          }));
        } catch (err) {
          console.error(`Failed to parse ${eventName}:`, err);
        }
      });
    }

    // Step 5: Handle errors (browser auto-reconnects!)
    es.onerror = () => {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: "Connection lost — reconnecting...",
      }));
      // EventSource automatically retries — no manual reconnect needed!
    };
  }, [url, events]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return state;
}
