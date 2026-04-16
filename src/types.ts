export type Position = {
  id: string;
  name: string;
  url: string;
  isin: string;
  exchange: string;
  amount: number;
  rate: number;
  want: number | null;
  sold: boolean;
  hide: boolean;
};

export type Quote = { isin: string; bid: number | null; change: number | null };