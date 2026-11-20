import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { useResetPortfolioMutation } from "@/features/portfolio/hooks";
import { SettingsSection } from "./SettingsSection";

/** Resets the simulated account to its starting state. Two steps, so it cannot happen by accident. */
export function SimulationDataSection() {
  const reset = useResetPortfolioMutation();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <SettingsSection title="Simulation data" description="Your simulated portfolio and transactions are saved to your account.">
      {done && (
        <div className="mb-4">
          <FormAlert tone="success">The simulated portfolio was reset to its starting state.</FormAlert>
        </div>
      )}
      {reset.isError && (
        <div className="mb-4">
          <FormAlert tone="error">{reset.error.message}</FormAlert>
        </div>
      )}
      {confirming ? (
        <div className="space-y-3">
          <p className="text-sm">This replaces your simulated holdings, balance and transactions. It cannot be undone.</p>
          <div className="flex gap-2">
            <Button
              disabled={reset.isPending}
              onClick={() =>
                reset.mutate(undefined, {
                  onSuccess: () => {
                    setConfirming(false);
                    setDone(true);
                  },
                })
              }
            >
              {reset.isPending ? "Resetting…" : "Yes, reset portfolio"}
            </Button>
            <Button variant="ghost" disabled={reset.isPending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          onClick={() => {
            reset.reset();
            setDone(false);
            setConfirming(true);
          }}
        >
          Reset simulated portfolio
        </Button>
      )}
    </SettingsSection>
  );
}
