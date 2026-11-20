import { useState } from "react";

interface CoinLogoProps {
  symbol: string;
  color: string;
  /** Logo from the market provider. Falls back to a generated badge if missing or if it fails to load. */
  imageUrl?: string | null;
  size?: number;
}

export function CoinLogo({ symbol, color, imageUrl = null, size = 32 }: CoinLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (imageUrl && imageUrl !== failedUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(imageUrl)}
        className="shrink-0 rounded-full bg-surface-2 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        color,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {symbol.slice(0, 3)}
    </span>
  );
}
