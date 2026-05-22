const TRADEGATE_URL = "https://www.tradegate.de/refresh.php";

export type Quote = {
  isin: string;
  bid: number | null;
  change: number | null;
};

export async function fetchTradegateQuote(isin: string): Promise<Quote> {
  const url = new URL(TRADEGATE_URL);
  url.searchParams.set("isin", isin);

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    console.debug("fetching:", url, response);
    return { isin, bid: null, change: null };
  }

  let data: { bid: number | null; close: number | null } = {
    bid: null,
    close: null,
  };

  try {
    const raw = (await response.json()) as {
      bid?: string | number;
      close?: string | number;
    };
    data.bid = parseNumber(raw.bid) ?? null;
    data.close = parseNumber(raw.close);
  } catch (err) {
    console.error(err);
  }

  return {
    isin,
    bid: data.bid,
    change:
      data.bid !== null && data.close !== null && data.close > 0
        ? (data.bid / data.close - 1) * 100
        : null,
  };
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/\s/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function fetchTradegateQuotes(
  isins: string[],
): Promise<Record<string, Quote>> {
  const unique = [
    ...new Set(isins.map((isin) => isin.trim().toUpperCase()).filter(Boolean)),
  ];
  const results = await Promise.all(
    unique.map((isin) => fetchTradegateQuote(isin)),
  );
  return Object.fromEntries(results.map((quote) => [quote.isin, quote]));
}

export function readIsinsFromUrl(url: URL): string[] {
  const query = url.searchParams.get("isins");
  if (!query) {
    return [];
  }

  return query
    .split(",")
    .map((isin) => isin.trim())
    .filter(Boolean);
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
