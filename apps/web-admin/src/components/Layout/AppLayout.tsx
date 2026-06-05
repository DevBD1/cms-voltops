import type { ReactNode } from 'react';
import { ThemeToggle } from '../ThemeToggle';

export type CustomerTab = 'home' | 'history' | 'invoices' | 'stations' | 'support';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  userName: string;
  onLogout: () => void;
}

const TABS: { id: CustomerTab; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'home', label: 'Ana Sayfa', icon: (active) => <HomeIcon active={active} /> },
  { id: 'history', label: 'Geçmiş', icon: (active) => <HistoryIcon active={active} /> },
  { id: 'invoices', label: 'Faturalar', icon: (active) => <InvoiceIcon active={active} /> },
  { id: 'stations', label: 'İstasyonlar', icon: (active) => <StationIcon active={active} /> },
  { id: 'support', label: 'Destek', icon: (active) => <SupportIcon active={active} /> },
];

export function AppLayout({
  children,
  activeTab,
  onTabChange,
  userName,
  onLogout,
}: AppLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-50 text-ink dark:bg-night dark:text-white">

      {/* Atmospheric glow — visible in dark mode only */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72 opacity-0 dark:opacity-100 bg-[radial-gradient(ellipse_70%_35%_at_50%_0%,rgba(37,99,235,0.1),transparent)]"
      />

      {/* ── Header — frosted glass ────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 shadow-sm backdrop-blur-xl dark:border-white/[0.07] dark:bg-night/80 dark:shadow-none">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 sm:max-w-2xl lg:max-w-4xl">
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight text-brand-600 dark:text-brand-400">VoltOps</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{userName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-slate-200/80 bg-white/60 px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/9"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-6 pb-28 sm:max-w-2xl lg:max-w-4xl">
        {children}
      </main>

      {/* ── Bottom nav — frosted glass + active pill + top indicator ──── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.06)] dark:border-white/[0.07] dark:bg-night/80 dark:shadow-[0_-8px_32px_rgba(0,0,0,0.55)]"
        aria-label="Ana navigasyon"
      >
        <div className="mx-auto flex max-w-lg justify-around px-2 py-2 sm:max-w-2xl lg:max-w-4xl">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition-all duration-200 sm:text-xs ${
                  active
                    ? 'bg-brand-500/10 text-brand-600 dark:bg-brand-400/13 dark:text-brand-400'
                    : 'text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400'
                }`}
              >
                {/* top indicator bar */}
                <span
                  className={`absolute -top-px left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-brand-500 transition-all duration-200 dark:bg-brand-400 ${
                    active ? 'w-6 opacity-100' : 'w-0 opacity-0'
                  }`}
                />
                {tab.icon(active)}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function InvoiceIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function StationIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SupportIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}
