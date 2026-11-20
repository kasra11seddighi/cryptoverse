import { SelectField } from "@/components/ui/SelectField";
import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCIES, effectiveCurrency, isCurrencyAvailable } from "@/lib/currency";
import { usePreferencesStore } from "@/stores/preferences.store";
import { CURRENCY_CODES } from "@/types/settings";
import type { CurrencyCode } from "@/types/settings";
import { SettingsSection } from "./SettingsSection";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", available: true },
  { value: "light", label: "Light", available: false },
  { value: "system", label: "System", available: false },
] as const;

const CURRENCY_OPTIONS = CURRENCY_CODES.map((code) => ({
  value: code,
  label: isCurrencyAvailable(code)
    ? `${code} · ${CURRENCIES[code].label}`
    : `${code} · ${CURRENCIES[code].label} (unavailable: no live rate)`,
  disabled: !isCurrencyAvailable(code),
}));

export function DisplaySection() {
  const theme = usePreferencesStore((state) => state.theme);
  const currency = effectiveCurrency(usePreferencesStore((state) => state.currency));
  const setCurrency = usePreferencesStore((state) => state.setCurrency);
  const { format } = useCurrency();

  return (
    <SettingsSection title="Display" description="How CryptoVerse looks and formats amounts. Saved on this device.">
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Theme</legend>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${option.available ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${theme === option.value ? "border-cyan/50 bg-accent/10" : "border-line"}`}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme === option.value}
                  disabled={!option.available}
                  readOnly
                  className="accent-cyan-400"
                />
                {option.label}
                {!option.available && <span className="text-xs text-ink-muted">Coming soon</span>}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">CryptoVerse currently ships a single dark theme.</p>
        </fieldset>

        <div>
          <SelectField
            label="Currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
            options={CURRENCY_OPTIONS}
          />
          <p className="mt-2 text-xs text-ink-muted">
            Example: {format(1234.5)}. Market data is in USD. Other currencies are turned off until a live exchange-rate source is connected, so no made-up conversions are shown.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
