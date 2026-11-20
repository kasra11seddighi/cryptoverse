/** Attribution required by CoinGecko's API terms. */
export function PoweredByCoinGecko() {
  return (
    <a
      href="https://www.coingecko.com"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-gain" />
      Data by CoinGecko
    </a>
  );
}
