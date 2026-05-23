import type { ReactNode } from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { VoltOpsLogo } from '../VoltOpsLogo';

export type AdminTab =
  | 'overview'
  | 'stations'
  | 'devices'
  | 'maintenance'
  | 'support'
  | 'users';

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  pageTitle: string;
  userLabel: string;
  roleLabel: string;
  alertCount?: number;
  onLogout: () => void;
}

const TABS: { id: AdminTab; label: string; icon: (active: boolean) => ReactNode }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: (a) => <OverviewIcon active={a} /> },
  { id: 'stations', label: 'İstasyonlar', icon: (a) => <StationIcon active={a} /> },
  { id: 'devices', label: 'Cihazlar & Soketler', icon: (a) => <DeviceIcon active={a} /> },
  { id: 'maintenance', label: 'Bakım', icon: (a) => <MaintenanceIcon active={a} /> },
  { id: 'support', label: 'Destek Talepleri', icon: (a) => <SupportIcon active={a} /> },
  { id: 'users', label: 'Kullanıcılar', icon: (a) => <UsersIcon active={a} /> },
];

const TAB_TITLES: Record<AdminTab, string> = {
  overview: 'Genel Bakış',
  stations: 'İstasyonlar',
  devices: 'Cihazlar & Soketler',
  maintenance: 'Bakım Kayıtları',
  support: 'Destek Talepleri',
  users: 'Kullanıcılar',
};

export function getAdminPageTitle(tab: AdminTab): string {
  return TAB_TITLES[tab];
}

export function AdminLayout({
  children,
  activeTab,
  onTabChange,
  pageTitle,
  userLabel,
  roleLabel,
  alertCount = 0,
  onLogout,
}: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[#FAFAFA] text-ink dark:bg-[#0A0A0A] dark:text-white">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0A0A0A] lg:w-64">
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <VoltOpsLogo size="sm" />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Operatör Paneli
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Yönetim menüsü">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400'
                    : 'text-slate-600 hover:bg-[#FAFAFA] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon(active)}
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{userLabel}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabel}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-[#FAFAFA] dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-[#0A0A0A] lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {pageTitle}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {alertCount > 0 && (
              <span className="hidden items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 sm:inline-flex dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                <AlertIcon />
                {alertCount} arızalı soket
              </span>
            )}
            <ThemeToggle size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function navIconClass(active: boolean) {
  return `h-5 w-5 shrink-0 ${active ? 'text-brand-600 dark:text-brand-400' : ''}`;
}

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg className={navIconClass(active)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function StationIcon({ active }: { active: boolean }) {
  return (
    <svg className={navIconClass(active)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DeviceIcon({ active }: { active: boolean }) {
  return (
    <svg className={navIconClass(active)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function MaintenanceIcon({ active }: { active: boolean }) {
  return (
    <svg className={navIconClass(active)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SupportIcon({ active }: { active: boolean }) {
  return (
    <svg className={navIconClass(active)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg className={navIconClass(active)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
