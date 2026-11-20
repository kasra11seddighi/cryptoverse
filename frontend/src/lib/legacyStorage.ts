/** Browser storage keys used before the portfolio and watchlist moved to the server. */
const LEGACY_KEYS = ["cryptoverse:portfolio", "cryptoverse:watchlist"] as const;

/**
 * Removes the old simulated account and watchlist from this browser. They are never read again:
 * the server is the source of truth now, so leaving them behind would only mislead.
 */
export function removeLegacyStorage(): void {
  try {
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode, blocked); there is nothing to clean up then.
  }
}
