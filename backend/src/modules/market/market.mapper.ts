// Maps untrusted CoinGecko payloads into the normalized shapes returned by the API.

import { MarketError } from "./market.errors.js";
import type {
  ChartDays,
  ChartDto,
  ChartPointDto,
  CoinDetailDto,
  CoinDto,
  GlobalStatsDto,
  PriceChangePeriod,
  SearchResultDto,
  SimplePricesDto,
  TrendingCoinDto,
} from "./market.types.js";

/**
 * Maps CoinGecko payloads to the shapes the frontend consumes. Provider responses are treated as
 * untrusted: every field is checked, missing or non-numeric values become null (never 0 or NaN).
 */
type Rec = Record<string, unknown>;

const isRec = (value: unknown): value is Rec => typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const str = (value: unknown): string | null => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);
const usd = (value: unknown): number | null => (isRec(value) ? num(value.usd) : null);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** CoinGecko reports 0 for coins whose market cap it does not know. */
const positiveOrNull = (value: number | null): number | null => (value !== null && value > 0 ? value : null);

function mapSharedFields(id: string, symbol: string, name: string): Pick<CoinDto, "id" | "symbol" | "name"> {
  return { id, symbol: symbol.toUpperCase(), name };
}

/** One item of `GET /coins/markets`. Returns null when the entry has no usable id, name or price. */
export function mapMarketCoin(raw: unknown): CoinDto | null {
  if (!isRec(raw)) return null;
  const id = str(raw.id);
  const symbol = str(raw.symbol);
  const name = str(raw.name);
  const price = num(raw.current_price);
  if (!id || !symbol || !name || price === null) return null;

  const change = (suffix: string): number | null => num(raw[`price_change_percentage_${suffix}_in_currency`]);

  return {
    ...mapSharedFields(id, symbol, name),
    imageUrl: str(raw.image),
    rank: num(raw.market_cap_rank),
    price,
    marketCap: positiveOrNull(num(raw.market_cap)),
    fullyDilutedValuation: positiveOrNull(num(raw.fully_diluted_valuation)),
    volume24h: num(raw.total_volume),
    high24h: num(raw.high_24h),
    low24h: num(raw.low_24h),
    priceChange: {
      "1H": change("1h"),
      "24H": change("24h") ?? num(raw.price_change_percentage_24h),
      "7D": change("7d"),
      "30D": change("30d"),
      "1Y": change("1y"),
    },
    circulatingSupply: num(raw.circulating_supply),
    totalSupply: num(raw.total_supply),
    maxSupply: num(raw.max_supply),
    ath: num(raw.ath),
    athChangePercent: num(raw.ath_change_percentage),
    atl: num(raw.atl),
    atlChangePercent: num(raw.atl_change_percentage),
  };
}

export function mapMarketCoins(raw: unknown): CoinDto[] {
  return list(raw).flatMap((item) => mapMarketCoin(item) ?? []);
}

/** CoinGecko descriptions contain HTML. The API returns plain text only. */
export function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** `GET /coins/{id}`. Throws NOT_FOUND when the coin has no market data. */
export function mapCoinDetail(raw: unknown): CoinDetailDto {
  const id = isRec(raw) ? str(raw.id) : null;
  const symbol = isRec(raw) ? str(raw.symbol) : null;
  const name = isRec(raw) ? str(raw.name) : null;
  const market = isRec(raw) && isRec(raw.market_data) ? raw.market_data : null;
  const price = market ? usd(market.current_price) : null;

  if (!isRec(raw) || !id || !symbol || !name || !market || price === null) {
    throw new MarketError("No market data is available for this coin.", 404, "NOT_FOUND");
  }

  const image = isRec(raw.image) ? (str(raw.image.large) ?? str(raw.image.small) ?? str(raw.image.thumb)) : null;
  const description = isRec(raw.description) ? str(raw.description.en) : null;
  const plainDescription = description ? toPlainText(description) : "";

  const change = (period: PriceChangePeriod): number | null => {
    switch (period) {
      case "1H":
        return usd(market.price_change_percentage_1h_in_currency);
      case "24H":
        return num(market.price_change_percentage_24h);
      case "7D":
        return num(market.price_change_percentage_7d);
      case "30D":
        return num(market.price_change_percentage_30d);
      case "1Y":
        return num(market.price_change_percentage_1y);
    }
  };

  return {
    ...mapSharedFields(id, symbol, name),
    imageUrl: image,
    rank: num(raw.market_cap_rank),
    price,
    marketCap: positiveOrNull(usd(market.market_cap)),
    fullyDilutedValuation: positiveOrNull(usd(market.fully_diluted_valuation)),
    volume24h: usd(market.total_volume),
    high24h: usd(market.high_24h),
    low24h: usd(market.low_24h),
    priceChange: { "1H": change("1H"), "24H": change("24H"), "7D": change("7D"), "30D": change("30D"), "1Y": change("1Y") },
    circulatingSupply: num(market.circulating_supply),
    totalSupply: num(market.total_supply),
    maxSupply: num(market.max_supply),
    ath: usd(market.ath),
    athChangePercent: usd(market.ath_change_percentage),
    atl: usd(market.atl),
    atlChangePercent: usd(market.atl_change_percentage),
    description: plainDescription === "" ? null : plainDescription,
    categories: list(raw.categories).flatMap((category) => str(category) ?? []),
  };
}

/** `GET /global`, without the breadth figure (added by the service from the market list). */
export function mapGlobal(raw: unknown): Omit<GlobalStatsDto, "breadth"> {
  const data = isRec(raw) && isRec(raw.data) ? raw.data : null;
  if (!data) throw new MarketError("The market data provider returned an unexpected response.", 502, "UPSTREAM_ERROR");

  const dominance = isRec(data.market_cap_percentage) ? data.market_cap_percentage : {};
  return {
    totalMarketCap: usd(data.total_market_cap),
    totalVolume24h: usd(data.total_volume),
    btcDominance: num(dominance.btc),
    ethDominance: num(dominance.eth),
    marketCapChange24h: num(data.market_cap_change_percentage_24h_usd),
    activeCryptocurrencies: num(data.active_cryptocurrencies),
    markets: num(data.markets),
  };
}

function toPoints(raw: unknown): ChartPointDto[] {
  const points: ChartPointDto[] = [];
  for (const pair of list(raw)) {
    if (!Array.isArray(pair)) continue;
    const timestamp = num(pair[0]);
    const value = num(pair[1]);
    if (timestamp !== null && value !== null) points.push({ timestamp, value });
  }
  return points.sort((a, b) => a.timestamp - b.timestamp);
}

/** Keeps the first and last points and spreads the rest evenly, so long ranges stay light. */
export function downsample(points: readonly ChartPointDto[], maxPoints: number): ChartPointDto[] {
  if (points.length <= maxPoints || maxPoints < 2) return [...points];
  const step = (points.length - 1) / (maxPoints - 1);
  const picked: ChartPointDto[] = [];
  let lastIndex = -1;
  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round(i * step);
    const point = points[index];
    if (index !== lastIndex && point) picked.push(point);
    lastIndex = index;
  }
  return picked;
}

export function mapChart(raw: unknown, id: string, requested: ChartDays, effective: ChartDays, maxPoints: number): ChartDto {
  if (!isRec(raw)) throw new MarketError("The market data provider returned an unexpected response.", 502, "UPSTREAM_ERROR");
  return {
    id,
    days: requested,
    effectiveDays: effective,
    truncated: requested !== effective,
    prices: downsample(toPoints(raw.prices), maxPoints),
    marketCaps: downsample(toPoints(raw.market_caps), maxPoints),
    totalVolumes: downsample(toPoints(raw.total_volumes), maxPoints),
  };
}

/** `GET /search`: coin hits only. Prices are filled in later from the cached market list. */
export function mapSearchHits(raw: unknown): Array<Omit<SearchResultDto, "price" | "change24h">> {
  const coins = isRec(raw) ? list(raw.coins) : [];
  return coins.flatMap((coin) => {
    if (!isRec(coin)) return [];
    const id = str(coin.id);
    const name = str(coin.name);
    const symbol = str(coin.symbol);
    if (!id || !name || !symbol) return [];
    return [{ id, name, symbol: symbol.toUpperCase(), rank: num(coin.market_cap_rank), imageUrl: str(coin.large) ?? str(coin.thumb) }];
  });
}

/** `GET /search/trending`: `coins[].item`. */
export function mapTrending(raw: unknown): TrendingCoinDto[] {
  const coins = isRec(raw) ? list(raw.coins) : [];
  return coins.flatMap((entry) => {
    const item = isRec(entry) ? entry.item : null;
    if (!isRec(item)) return [];
    const id = str(item.id);
    const name = str(item.name);
    const symbol = str(item.symbol);
    if (!id || !name || !symbol) return [];
    return [{ id, name, symbol: symbol.toUpperCase(), rank: num(item.market_cap_rank), score: num(item.score), imageUrl: str(item.large) ?? str(item.thumb) }];
  });
}

/** `GET /simple/price`. Unknown ids are simply absent from the provider response and from the result. */
export function mapSimplePrices(raw: unknown): SimplePricesDto {
  const result: SimplePricesDto = {};
  if (!isRec(raw)) return result;
  for (const [id, value] of Object.entries(raw)) {
    if (!isRec(value)) continue;
    result[id] = { usd: num(value.usd), usd24hChange: num(value.usd_24h_change) };
  }
  return result;
}
