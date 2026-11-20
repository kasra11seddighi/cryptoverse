import { Switch } from "@/components/ui/Switch";
import { usePreferencesStore } from "@/stores/preferences.store";
import type { NotificationPreferences } from "@/types/settings";
import { SettingsSection } from "./SettingsSection";

const ITEMS: ReadonlyArray<{ key: keyof NotificationPreferences; label: string; description: string }> = [
  { key: "priceAlerts", label: "Price alerts", description: "Big moves in coins on your watchlist." },
  { key: "portfolioUpdates", label: "Portfolio updates", description: "Changes in the value of your simulated portfolio." },
  { key: "marketNews", label: "Market news", description: "Headlines about the wider market." },
  { key: "securityAlerts", label: "Security alerts", description: "Sign-ins and account changes." },
  { key: "emailDigest", label: "Email digest", description: "A weekly summary by email." },
];

export function NotificationsSection() {
  const notifications = usePreferencesStore((state) => state.notifications);
  const setNotification = usePreferencesStore((state) => state.setNotification);

  return (
    <SettingsSection title="Notifications" description="Choose what you want to hear about. Saved on this device.">
      <ul className="divide-y divide-line">
        {ITEMS.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-ink-muted">{item.description}</p>
            </div>
            <Switch
              label={item.label}
              checked={notifications[item.key]}
              onChange={(checked) => setNotification(item.key, checked)}
            />
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-muted">
        These choices are stored in this browser. Delivering notifications is not available yet.
      </p>
    </SettingsSection>
  );
}
