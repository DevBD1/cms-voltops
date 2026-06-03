import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  accent?: 'brand' | 'success' | 'warning' | 'danger';
}

const ACCENT_BORDER = {
  brand: 'border-t-brand-600 dark:border-t-brand-400',
  success: 'border-t-emerald-500',
  warning: 'border-t-amber-500',
  danger: 'border-t-red-500',
} as const;

const ACCENT_ICON = {
  brand: 'text-brand-600 dark:text-brand-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
} as const;

export function KpiCard({ title, value, icon, accent = 'brand' }: KpiCardProps) {
  return (
    <article
      className={`rounded-lg border border-slate-200 border-t-[3px] bg-white p-6 dark:border-slate-800 dark:bg-[#111111] ${ACCENT_BORDER[accent]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={`shrink-0 rounded-md bg-[#FAFAFA] p-2.5 dark:bg-slate-900 ${ACCENT_ICON[accent]}`}>
          {icon}
        </div>
      </div>
    </article>
  );
}
