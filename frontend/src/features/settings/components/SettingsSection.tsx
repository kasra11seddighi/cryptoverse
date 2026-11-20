import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";

interface SettingsSectionProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}
