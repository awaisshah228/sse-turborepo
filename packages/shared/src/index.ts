export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  timestamp: number;
}

export interface NewsEvent {
  headline: string;
  timestamp: number;
}

export interface HeartbeatEvent {
  time: number;
}

export type SSEEventType = "stock-update" | "news" | "heartbeat";

export interface ServerEvent {
  type: SSEEventType;
  data: StockPrice | NewsEvent | HeartbeatEvent;
}

export const STOCKS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"] as const;
export type StockSymbol = (typeof STOCKS)[number];
