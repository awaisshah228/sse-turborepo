// Shared types between frontend and backend

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  timestamp: number;
}

export interface ServerEvent {
  type: "stock-update" | "news" | "heartbeat";
  data: StockPrice | string;
}

export const STOCKS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"] as const;
