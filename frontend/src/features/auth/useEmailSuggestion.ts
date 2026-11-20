import { useMemo, useState } from "react";
import { normalizeEmail, suggestEmailCorrection } from "@/utils/email";

/**
 * Tracks a "did you mean" suggestion for an email field. The user's decision to keep the
 * original address only applies to that exact address; editing it re-enables the suggestion.
 */
export function useEmailSuggestion(rawEmail: string, fieldVisible: boolean) {
  const normalized = normalizeEmail(rawEmail);
  const [keptAddress, setKeptAddress] = useState<string | null>(null);

  const suggestion = useMemo(() => suggestEmailCorrection(normalized), [normalized]);
  const pending = suggestion !== null && keptAddress !== normalized ? suggestion : null;

  return {
    /** A suggestion the user has not resolved yet (blocks submit until accepted or kept). */
    pending,
    /** Whether the hint should be on screen (after blur or a submit attempt). */
    visible: pending !== null && fieldVisible,
    original: normalized,
    keepOriginal: () => setKeptAddress(normalized),
  };
}
