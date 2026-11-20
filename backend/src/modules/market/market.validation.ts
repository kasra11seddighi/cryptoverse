// Validates and normalizes market query parameters and coin identifiers.

import { validationError } from "./market.errors.js";
import type { ChartDays, CoinsQuery, CoinSortKey } from "./market.types.js";

/** Express gives query values as string | string[] | objects; everything is checked as `unknown`. */
const SORT_KEYS: readonly CoinSortKey[] = ["rank", "name", "price", "change24h", "marketCap", "volume24h", "circulatingSupply"];
const CHART_DAYS: readonly ChartDays[] = ["1", "7", "30", "90", "365", "max"];
const COIN_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export const MAX_PAGE_SIZE = 250;
export const MAX_IDS = 100;

function single(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw validationError(`"${name}" must be a single value.`);
  return value;
}

function integer(value: unknown, name: string, fallback: number, min: number, max: number): number {
  const text = single(value, name);
  if (text === undefined || text.trim() === "") return fallback;
  if (!/^\d+$/.test(text.trim())) throw validationError(`"${name}" must be a whole number.`);
  const parsed = Number.parseInt(text, 10);
  if (parsed < min || parsed > max) throw validationError(`"${name}" must be between ${min} and ${max}.`);
  return parsed;
}

/** CoinGecko ids are lowercase letters, digits and hyphens. Case is normalised. */
export function parseCoinId(value: unknown, name = "id"): string {
  const text = single(value, name)?.trim().toLowerCase();
  if (!text || !COIN_ID_PATTERN.test(text)) throw validationError(`"${name}" is not a valid coin id.`);
  return text;
}

export function parseIdList(value: unknown, name: string, required: boolean): string[] | null {
  const text = single(value, name);
  if (text === undefined || text.trim() === "") {
    if (required) throw validationError(`"${name}" is required.`);
    return null;
  }
  const ids = [...new Set(text.split(",").map((part) => parseCoinId(part, name)))];
  if (ids.length > MAX_IDS) throw validationError(`"${name}" accepts at most ${MAX_IDS} ids.`);
  return ids;
}

export function parseCoinsQuery(query: Record<string, unknown>): CoinsQuery {
  const sortBy = single(query.sortBy, "sortBy") ?? "rank";
  if (!(SORT_KEYS as readonly string[]).includes(sortBy)) {
    throw validationError(`"sortBy" must be one of: ${SORT_KEYS.join(", ")}.`);
  }
  const sortDirection = single(query.sortDirection, "sortDirection") ?? "asc";
  if (sortDirection !== "asc" && sortDirection !== "desc") throw validationError('"sortDirection" must be "asc" or "desc".');

  const search = (single(query.search, "search") ?? "").trim();
  if (search.length > 64) throw validationError('"search" must be at most 64 characters.');

  return {
    page: integer(query.page, "page", 1, 1, 100_000),
    pageSize: integer(query.pageSize, "pageSize", 20, 1, MAX_PAGE_SIZE),
    search,
    sortBy: sortBy as CoinSortKey,
    sortDirection,
    ids: parseIdList(query.ids, "ids", false),
  };
}

export function parseChartDays(value: unknown): ChartDays {
  const days = single(value, "days") ?? "7";
  if (!(CHART_DAYS as readonly string[]).includes(days)) {
    throw validationError(`"days" must be one of: ${CHART_DAYS.join(", ")}.`);
  }
  return days as ChartDays;
}

export function parseSearchQuery(query: Record<string, unknown>): { query: string; limit: number } {
  const text = (single(query.query, "query") ?? "").trim();
  if (text === "") throw validationError('"query" is required.');
  if (text.length > 64) throw validationError('"query" must be at most 64 characters.');
  return { query: text, limit: integer(query.limit, "limit", 6, 1, 10) };
}

export function parseTrendingLimit(query: Record<string, unknown>): number {
  return integer(query.limit, "limit", 10, 1, 15);
}

export function parsePricesQuery(query: Record<string, unknown>): string[] {
  return parseIdList(query.ids, "ids", true) ?? [];
}
