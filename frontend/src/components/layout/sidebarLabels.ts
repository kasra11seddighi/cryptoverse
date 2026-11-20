/** always: drawer · lg: rail on tablet, full on desktop · never: collapsed rail. */
export type LabelMode = "always" | "lg" | "never";

export const LABEL_CLASSES: Record<LabelMode, { label: string; row: string }> = {
  always: { label: "inline", row: "justify-start" },
  lg: { label: "hidden lg:inline", row: "justify-center lg:justify-start" },
  never: { label: "hidden", row: "justify-center" },
};
