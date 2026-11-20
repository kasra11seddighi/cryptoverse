import { CircleAlert, CircleCheck } from "lucide-react";

interface FormAlertProps {
  tone: "error" | "success";
  children: string;
}

export function FormAlert({ tone, children }: FormAlertProps) {
  const isError = tone === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${isError ? "border-loss/40 bg-loss/10 text-loss" : "border-gain/40 bg-gain/10 text-gain"}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
