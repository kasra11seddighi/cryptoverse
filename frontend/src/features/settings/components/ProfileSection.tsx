import { useAuthStore } from "@/stores/auth.store";
import { formatDate } from "@/utils/format";
import { SettingsSection } from "./SettingsSection";

export function ProfileSection() {
  const user = useAuthStore((state) => state.user);

  const rows: ReadonlyArray<readonly [string, string]> = user
    ? [
        ["Name", user.name ?? "Not set"],
        ["Email", user.email],
        ["Role", user.role ?? "Not available"],
        ["Member since", user.createdAt ? formatDate(user.createdAt) : "Not available"],
        ["Account ID", user.id],
      ]
    : [];

  return (
    <SettingsSection title="Profile" description="Your account information, as returned by the server.">
      {user ? (
        <dl className="divide-y divide-line text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="break-all text-right">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-ink-muted">Your profile could not be loaded.</p>
      )}
      <p className="mt-4 text-xs text-ink-muted">
        Profile details are read-only for now: the server does not offer a way to change them yet.
      </p>
    </SettingsSection>
  );
}
