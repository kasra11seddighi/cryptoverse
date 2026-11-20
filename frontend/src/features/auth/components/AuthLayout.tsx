import type { ReactNode } from "react";
import { Activity, ShieldCheck, Wallet } from "lucide-react";

const HIGHLIGHTS = [
  { icon: Activity, text: "Track the market and every coin in one place" },
  { icon: Wallet, text: "Practice with a simulated portfolio, no real funds" },
  { icon: ShieldCheck, text: "Session tokens stay in memory, never in storage" },
] as const;

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between border-r border-line bg-surface p-12 lg:flex">
        <Brand />
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Market analytics with a portfolio you can practice on.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-ink-muted">
                <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface-2 text-cyan">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-ink-muted">
          CryptoVerse is an analytics tool. It does not execute real trades or hold real funds.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-cyan ring-1 ring-accent/30">
        <Activity className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight">CryptoVerse</span>
    </div>
  );
}
