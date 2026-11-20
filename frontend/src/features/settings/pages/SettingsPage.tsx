import { PageHeader } from "@/components/ui/PageHeader";
import { DisplaySection } from "../components/DisplaySection";
import { NotificationsSection } from "../components/NotificationsSection";
import { ProfileSection } from "../components/ProfileSection";
import { SecuritySection } from "../components/SecuritySection";
import { SimulationDataSection } from "../components/SimulationDataSection";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account information and preferences. Preferences are saved on this device; nothing here changes your server account."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ProfileSection />
          <SecuritySection />
        </div>
        <div className="space-y-6">
          <DisplaySection />
          <NotificationsSection />
          <SimulationDataSection />
        </div>
      </div>
    </div>
  );
}
