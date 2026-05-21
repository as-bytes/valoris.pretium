export type Position = {
  id: string;
  name: string;
  url: string | null;
  isin: string;
  exchange: string | null;
  amount: number;
  rate: number;
  want: number | null;
  sold: boolean;
  hide: boolean;
};

export type NewPosition = {
  id: string;
  name: string | null;
  url: string | null;
  isin: string | null;
  exchange: string | null;
  amount: number | null;
  rate: number | null;
  want: number | null;
  sold: boolean;
  hide: boolean;
};

export type Quote = { isin: string; bid: number | null; change: number | null };

export type StorageModel = {
  version: string;
  positions: Position[];
  lastQuotes: Record<string, Quote>;
  lastRefresh: string;
};
