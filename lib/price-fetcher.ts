import type { Holding } from "@/types";

/** Auto-mapping for the most common crypto tickers → CoinGecko coin id. */
const COINGECKO_TICKER_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  LTC: "litecoin",
  ATOM: "cosmos",
  NEAR: "near",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  SUI: "sui",
  TON: "the-open-network",
  PEPE: "pepe",
  SHIB: "shiba-inu",
  TRX: "tron",
  UNI: "uniswap",
  AAVE: "aave",
};

export function resolveCoingeckoId(h: Holding): string | null {
  if (h.coingeckoId) return h.coingeckoId;
  return COINGECKO_TICKER_MAP[h.ticker.toUpperCase()] ?? null;
}

export function resolveYahooSymbol(h: Holding): string | null {
  if (h.yahooSymbol) return h.yahooSymbol;
  // Conservative: USD holdings often work with the bare ticker;
  // EUR holdings need an explicit market suffix (.PA, .DE, .AS, .L).
  return h.currency === "USD" ? h.ticker : null;
}

/**
 * Fetch CoinGecko spot prices in EUR for one or more coin ids.
 * Returns a map { coinId → priceEur }. Coins not returned by the API are absent from the map.
 */
export async function fetchCryptoPricesEUR(
  ids: string[],
): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=eur`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = (await res.json()) as Record<string, { eur?: number }>;
  const out: Record<string, number> = {};
  for (const [id, val] of Object.entries(data)) {
    if (typeof val?.eur === "number") out[id] = val.eur;
  }
  return out;
}

/** Returns EUR per 1 USD. */
export async function fetchEurUsdRate(): Promise<number> {
  const res = await fetch(
    "https://api.frankfurter.app/latest?from=USD&to=EUR",
  );
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const data = (await res.json()) as { rates?: { EUR?: number } };
  if (typeof data.rates?.EUR !== "number") {
    throw new Error("Frankfurter: missing EUR rate");
  }
  return data.rates.EUR;
}

export interface YahooQuote {
  price: number;
  currency: "EUR" | "USD";
}

/**
 * Fetch a Yahoo Finance quote. Returns null if the symbol is unknown or the
 * payload doesn't contain a sane price/currency.
 */
export async function fetchYahooPrice(
  symbol: string,
): Promise<YahooQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta?: { regularMarketPrice?: number; currency?: string };
      }>;
    };
  };
  const meta = data.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const currency = meta?.currency;
  if (typeof price !== "number") return null;
  if (currency !== "EUR" && currency !== "USD") return null;
  return { price, currency };
}
