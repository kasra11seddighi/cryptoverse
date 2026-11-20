export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-blue-500 disabled:hover:bg-accent",
  secondary: "border border-line bg-surface-2 text-ink hover:border-ink-muted/50",
  ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
};

/** Shared look of buttons and link-buttons. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", fullWidth = false): string {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:cursor-not-allowed disabled:opacity-60 ${SIZES[size]} ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""}`;
}
