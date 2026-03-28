import { useEffect, useRef, useState, useCallback } from "react";

interface UseSSEOptions {
  url: string;
  events: string[];
}

interface SSEState<T> {
  data: T | null;
  lastEvent: string | null;
  isConnected: boolean;
  error: string | null;
  history: Array<{ event: string; data: T; time: Date }>;
  reconnectCount: number;
}

export function useSSE<T>({ url, events }: UseSSEOptions) {
  const [state, setState] = useState<SSEState<T>>({
    data: null,
    lastEvent: null,
    isConnected: false,
    error: null,
    history: [],
    reconnectCount: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const handlersRef = useRef<Array<{ event: string; handler: (e: MessageEvent) => void }>>([]);

  const connect = useCallback(() => {
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true, error: null }));
    };

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        // Handle server shutdown notification
        if (parsed.type === "server-shutdown") {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            error: "Server shutting down...",
          }));
        }
      } catch {
        // Non-JSON default message, ignore
      }
    };

    const handlers: typeof handlersRef.current = [];
    for (const eventName of events) {
      const handler = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as T;
          setState((prev) => ({
            ...prev,
            data: parsed,
            lastEvent: eventName,
            history: [
              { event: eventName, data: parsed, time: new Date() },
              ...prev.history.slice(0, 49),
            ],
          }));
        } catch (err) {
          console.error(`Failed to parse ${eventName}:`, err);
        }
      };
      es.addEventListener(eventName, handler);
      handlers.push({ event: eventName, handler });
    }

    // Listen for server shutdown event
    const shutdownHandler = () => {
      es.close();
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: "Server shutting down — will reconnect when available",
      }));
    };
    es.addEventListener("server-shutdown", shutdownHandler);
    handlers.push({ event: "server-shutdown", handler: shutdownHandler });

    handlersRef.current = handlers;

    es.onerror = () => {
      setState((prev) => ({
        ...prev,
        isConnected: false,
        error: "Connection lost — reconnecting...",
        reconnectCount: prev.reconnectCount + 1,
      }));
    };
  }, [url, events]);

  useEffect(() => {
    connect();
    return () => {
      const es = eventSourceRef.current;
      if (es) {
        for (const { event, handler } of handlersRef.current) {
          es.removeEventListener(event, handler);
        }
        es.close();
      }
      handlersRef.current = [];
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    const es = eventSourceRef.current;
    if (es) {
      for (const { event, handler } of handlersRef.current) {
        es.removeEventListener(event, handler);
      }
      es.close();
    }
    handlersRef.current = [];
    setState((prev) => ({ ...prev, isConnected: false, error: null }));
  }, []);

  return { ...state, disconnect, reconnect: connect };
}
