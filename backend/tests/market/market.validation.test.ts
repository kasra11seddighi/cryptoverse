// Tests input validation for market query parameters and coin identifiers.

import { describe, expect, it } from "vitest";

import { MarketError } from "../../src/modules/market/market.errors.js";
import {
  MAX_IDS,
  parseChartDays,
  parseCoinId,
  parseCoinsQuery,
  parsePricesQuery,
  parseSearchQuery,
  parseTrendingLimit,
} from "../../src/modules/market/market.validation.js";

function expectValidationError(action: () => unknown): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(MarketError);
    expect((error as MarketError).statusCode).toBe(400);
    expect((error as MarketError).code).toBe("VALIDATION_ERROR");
    return;
  }
  throw new Error("Expected a validation error");
}

describe("parseCoinId", () => {
  it("normalises case and whitespace", () => {
    expect(parseCoinId("  Bitcoin ")).toBe("bitcoin");
  });

  it.each(["", "   ", "../etc/passwd", "bit coin", "bitcoin?x=1", "-bitcoin", "a".repeat(101), "bitcoin/chart", "<script>"])(
    "rejects %j",
    (value) => {
      expectValidationError(() => parseCoinId(value));
    },
  );

  it("rejects missing and non-string values (repeated or nested query params)", () => {
    expectValidationError(() => parseCoinId(undefined));
    expectValidationError(() => parseCoinId(["a", "b"]));
    expectValidationError(() => parseCoinId({ a: "b" }));
  });
});

describe("parseCoinsQuery", () => {
  it("applies defaults", () => {
    expect(parseCoinsQuery({})).toEqual({
      page: 1,
      pageSize: 20,
      search: "",
      sortBy: "rank",
      sortDirection: "asc",
      ids: null,
    });
  });

  it("parses valid values", () => {
    const query = parseCoinsQuery({ page: "3", pageSize: "250", search: " btc ", sortBy: "marketCap", sortDirection: "desc", ids: "bitcoin,ethereum,bitcoin" });
    expect(query).toMatchObject({ page: 3, pageSize: 250, search: "btc", sortBy: "marketCap", sortDirection: "desc", ids: ["bitcoin", "ethereum"] });
  });

  it.each([
    ["page", "0"],
    ["page", "-1"],
    ["page", "1.5"],
    ["page", "abc"],
    ["page", "100001"],
    ["pageSize", "0"],
    ["pageSize", "251"],
    ["sortBy", "dropTable"],
    ["sortDirection", "up"],
  ])("rejects %s=%s", (name, value) => {
    expectValidationError(() => parseCoinsQuery({ [name]: value }));
  });

  it("rejects an over-long search and array parameters", () => {
    expectValidationError(() => parseCoinsQuery({ search: "x".repeat(65) }));
    expectValidationError(() => parseCoinsQuery({ page: ["1", "2"] }));
  });

  it("limits the number of ids", () => {
    const ok = Array.from({ length: MAX_IDS }, (_, i) => `coin-${i}`).join(",");
    const tooMany = Array.from({ length: MAX_IDS + 1 }, (_, i) => `coin-${i}`).join(",");
    expect(parseCoinsQuery({ ids: ok }).ids).toHaveLength(MAX_IDS);
    expectValidationError(() => parseCoinsQuery({ ids: tooMany }));
  });

  it("rejects an id list containing an invalid id", () => {
    expectValidationError(() => parseCoinsQuery({ ids: "bitcoin,../x" }));
  });
});

describe("parseChartDays", () => {
  it("defaults to 7 and accepts the allowed ranges", () => {
    expect(parseChartDays(undefined)).toBe("7");
    for (const days of ["1", "7", "30", "90", "365", "max"]) expect(parseChartDays(days)).toBe(days);
  });

  it.each(["2", "0", "-1", "9999", "MAX", "all"])("rejects %s", (value) => {
    expectValidationError(() => parseChartDays(value));
  });
});

describe("parseSearchQuery", () => {
  it("requires a query and trims it", () => {
    expect(parseSearchQuery({ query: "  bit " })).toEqual({ query: "bit", limit: 6 });
    expectValidationError(() => parseSearchQuery({}));
    expectValidationError(() => parseSearchQuery({ query: "   " }));
  });

  it("limits query length and result count", () => {
    expectValidationError(() => parseSearchQuery({ query: "x".repeat(65) }));
    expectValidationError(() => parseSearchQuery({ query: "btc", limit: "11" }));
    expect(parseSearchQuery({ query: "btc", limit: "10" }).limit).toBe(10);
  });
});

describe("parseTrendingLimit", () => {
  it("defaults to 10 and caps at 15", () => {
    expect(parseTrendingLimit({})).toBe(10);
    expect(parseTrendingLimit({ limit: "15" })).toBe(15);
    expectValidationError(() => parseTrendingLimit({ limit: "16" }));
    expectValidationError(() => parseTrendingLimit({ limit: "0" }));
  });
});

describe("parsePricesQuery", () => {
  it("requires ids", () => {
    expectValidationError(() => parsePricesQuery({}));
    expectValidationError(() => parsePricesQuery({ ids: "" }));
    expect(parsePricesQuery({ ids: "bitcoin,ethereum" })).toEqual(["bitcoin", "ethereum"]);
  });
});
