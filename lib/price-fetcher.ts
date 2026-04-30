import type { Holding, HoldingType } from "@/types";

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

export interface AssetSearchResult {
  source: "coingecko" | "yahoo";
  type: HoldingType;
  ticker: string;
  name: string;
  currency: "EUR" | "USD";
  coingeckoId?: string;
  yahooSymbol?: string;
  marketHint?: string; // e.g. "Paris", "NASDAQ"
}

interface CoingeckoCoinHit {
  id: string;
  symbol?: string;
  name?: string;
  market_cap_rank?: number | null;
}

interface YahooQuoteHit {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string;
  exchDisp?: string;
  quoteType?: string;
  typeDisp?: string;
  currency?: string;
}

export async function searchCryptoAssets(
  query: string,
): Promise<AssetSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { coins?: CoingeckoCoinHit[] };
  const coins = (data.coins ?? [])
    .filter(
      (c) =>
        typeof c.id === "string" &&
        typeof c.symbol === "string" &&
        typeof c.name === "string",
    )
    .slice(0, 10);
  return coins.map<AssetSearchResult>((c) => ({
    source: "coingecko",
    type: "crypto",
    ticker: (c.symbol as string).toUpperCase(),
    name: c.name as string,
    currency: "USD",
    coingeckoId: c.id,
  }));
}

export async function searchYahooAssets(
  query: string,
): Promise<AssetSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  // Routed through our edge proxy: Yahoo's v1/search endpoint blocks browser
  // origins via CORS, so we fetch it server-side.
  const url = `/api/yahoo-search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { quotes?: YahooQuoteHit[] };
  const quotes = data.quotes ?? [];
  const out: AssetSearchResult[] = [];
  for (const q of quotes) {
    if (!q.symbol) continue;
    const type = mapYahooQuoteType(q.quoteType);
    if (!type) continue;
    if (type === "crypto") continue; // prefer CoinGecko entries for crypto
    const currency = q.currency === "EUR" ? "EUR" : "USD";
    out.push({
      source: "yahoo",
      type,
      ticker: q.symbol.split(".")[0].toUpperCase(),
      name: q.longname ?? q.shortname ?? q.symbol,
      currency,
      yahooSymbol: q.symbol,
      marketHint: q.exchDisp ?? q.exchange,
    });
  }
  return out;
}

function mapYahooQuoteType(t?: string): HoldingType | null {
  switch (t) {
    case "ETF":
      return "etf";
    case "EQUITY":
      return "stock";
    case "CRYPTOCURRENCY":
      return "crypto";
    case "MUTUALFUND":
      return "etf";
    case "INDEX":
      return null;
    default:
      return null;
  }
}

/**
 * Combined asset search across CoinGecko (crypto) and Yahoo (ETF, stock).
 * Returns deduped results, with crypto first when query matches.
 */
export async function searchAssets(
  query: string,
): Promise<AssetSearchResult[]> {
  const [crypto, yahoo] = await Promise.all([
    searchCryptoAssets(query).catch(() => [] as AssetSearchResult[]),
    searchYahooAssets(query).catch(() => [] as AssetSearchResult[]),
  ]);
  // Dedupe by source+key
  const seen = new Set<string>();
  const merged: AssetSearchResult[] = [];
  for (const r of [...crypto, ...yahoo]) {
    const key = `${r.source}:${r.coingeckoId ?? r.yahooSymbol ?? r.ticker}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
  }
  return merged.slice(0, 12);
}

/**
 * Fetch a Yahoo Finance quote. Returns null if the symbol is unknown or the
 * payload doesn't contain a sane price/currency.
 */
export async function fetchYahooPrice(
  symbol: string,
): Promise<YahooQuote | null> {
  const url = `/api/yahoo-quote?symbol=${encodeURIComponent(symbol)}`;
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
