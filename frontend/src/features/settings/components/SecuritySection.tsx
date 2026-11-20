import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useLogoutMutation } from "@/features/auth/hooks";
import { SettingsSection } from "./SettingsSection";

export function SecuritySection() {
  const logout = useLogoutMutation();

  return (
    <SettingsSection title="Security" description="How your session is protected.">
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-muted">
        <li>Your access token lives in memory only, so closing the tab ends it.</li>
        <li>Your session is renewed with a secure cookie that scripts cannot read.</li>
      </ul>
      <p className="mt-4 text-xs text-ink-muted">Changing your password is not available yet.</p>
      <div className="mt-4">
        <Button variant="secondary" loading={logout.isPending} onClick={() => logout.mutate()}>
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </SettingsSection>
  );
}
