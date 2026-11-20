// Tests the TTL cache: expiry, request coalescing, stale-on-error fallback, and size limits.

import { describe, expect, it, vi } from "vitest";

import { TtlCache } from "../../src/modules/market/market.cache.js";

function createClock(start = 1_000_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

describe("TtlCache", () => {
  it("serves a fresh value without calling the loader again", async () => {
    const clock = createClock();
    const cache = new TtlCache<number>({ now: clock.now });
    const loader = vi.fn().mockResolvedValue(1);

    await cache.getOrLoad("k", 1000, 5000, loader);
    clock.advance(999);
    const second = await cache.getOrLoad("k", 1000, 5000, loader);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ value: 1, stale: false });
  });

  it("reloads after the TTL has passed", async () => {
    const clock = createClock();
    const cache = new TtlCache<number>({ now: clock.now });
    const loader = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    await cache.getOrLoad("k", 1000, 5000, loader);
    clock.advance(1000);
    const second = await cache.getOrLoad("k", 1000, 5000, loader);

    expect(loader).toHaveBeenCalledTimes(2);
    expect(second.value).toBe(2);
  });

  it("shares one load between concurrent callers", async () => {
    const cache = new TtlCache<number>();
    let release: (value: number) => void = () => undefined;
    const loader = vi.fn(() => new Promise<number>((resolve) => (release = resolve)));

    const first = cache.getOrLoad("k", 1000, 5000, loader);
    const second = cache.getOrLoad("k", 1000, 5000, loader);
    release(42);

    expect((await first).value).toBe(42);
    expect((await second).value).toBe(42);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("serves a stale copy when the loader fails within the stale window", async () => {
    const clock = createClock();
    const onStaleServed = vi.fn();
    const cache = new TtlCache<number>({ now: clock.now, onStaleServed });

    const first = await cache.getOrLoad("k", 1000, 5000, async () => 7);
    clock.advance(2000);
    const second = await cache.getOrLoad("k", 1000, 5000, async () => {
      throw new Error("provider down");
    });

    expect(second).toMatchObject({ value: 7, stale: true, fetchedAt: first.fetchedAt });
    expect(onStaleServed).toHaveBeenCalledOnce();
  });

  it("rethrows when the cached copy is older than the stale window", async () => {
    const clock = createClock();
    const cache = new TtlCache<number>({ now: clock.now });

    await cache.getOrLoad("k", 1000, 5000, async () => 7);
    clock.advance(5001);

    await expect(
      cache.getOrLoad("k", 1000, 5000, async () => {
        throw new Error("provider down");
      }),
    ).rejects.toThrow("provider down");
  });

  it("rethrows when there is nothing cached, and does not cache the failure", async () => {
    const cache = new TtlCache<number>();
    const loader = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(5);

    await expect(cache.getOrLoad("k", 1000, 5000, loader)).rejects.toThrow("boom");
    expect((await cache.getOrLoad("k", 1000, 5000, loader)).value).toBe(5);
  });

  it("evicts the oldest entries beyond maxEntries", async () => {
    const cache = new TtlCache<number>({ maxEntries: 2 });
    await cache.getOrLoad("a", 1000, 5000, async () => 1);
    await cache.getOrLoad("b", 1000, 5000, async () => 2);
    await cache.getOrLoad("c", 1000, 5000, async () => 3);

    expect(cache.size).toBe(2);
    const loader = vi.fn().mockResolvedValue(10);
    await cache.getOrLoad("a", 1000, 5000, loader);
    expect(loader).toHaveBeenCalledOnce();
  });
});
