import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface EmailSuggestionProps {
  suggestion: string | null;
  original: string;
  onAccept: (suggestion: string) => void;
  onKeep: () => void;
  /** Incremented when a submit was blocked by the hint, to move focus to it. */
  focusSignal: number;
}

/** Non-blocking "did you mean" prompt. The user always decides; nothing is rewritten silently. */
export function EmailSuggestion({
  suggestion,
  original,
  onAccept,
  onKeep,
  focusSignal,
}: EmailSuggestionProps) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusSignal > 0) containerRef.current?.focus();
  }, [focusSignal]);

  return (
    <div aria-live="polite">
      {suggestion && (
        <div
          ref={containerRef}
          tabIndex={-1}
          role="group"
          aria-labelledby={titleId}
          className="mt-2 rounded-lg border border-cyan/30 bg-cyan/5 px-3 py-2.5 text-sm focus:outline-2 focus:outline-cyan"
        >
          <p id={titleId} className="text-ink-muted">
            Did you mean <span className="break-all font-medium text-ink">{suggestion}</span>?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => onAccept(suggestion)}>
              Use suggestion
            </Button>
            <Button size="sm" variant="ghost" onClick={onKeep} aria-label={`Keep ${original}`}>
              Keep original
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
