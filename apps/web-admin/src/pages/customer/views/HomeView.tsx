import { SessionStatusBadge } from '../../../components/customer/StatusBadge';
import { getActiveSession, getSessionHistory } from '../../../lib/customer-data';

interface HomeViewProps {
  userId: string;
  onNavigate: (tab: 'history' | 'stations') => void;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export function HomeView({ userId, onNavigate }: HomeViewProps) {
  const activeSession = getActiveSession(userId);
  const recentCompleted = getSessionHistory(userId).slice(0, 2);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Şarj özeti</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Aktif oturumunuz ve son işlemleriniz
        </p>
      </section>

      {activeSession ? (
        <article className="overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-900/50 dark:from-amber-950/30 dark:to-[#111111]">
          <div className="border-b border-amber-200/60 px-6 py-4 dark:border-amber-900/40">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Aktif şarj
              </p>
              <SessionStatusBadge status={activeSession.status} />
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{activeSession.stationName}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Başlangıç: {formatDate(activeSession.startTime)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-amber-200/60 dark:bg-amber-900/40">
            <div className="bg-white px-6 py-4 dark:bg-[#111111]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Enerji</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-white">
                {activeSession.totalKwh.toFixed(1)} <span className="text-sm font-normal text-slate-500">kWh</span>
              </p>
            </div>
            <div className="bg-white px-6 py-4 dark:bg-[#111111]">
              <p className="text-xs text-slate-500 dark:text-slate-400">Tutar</p>
              <p className="mt-1 font-mono text-xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(activeSession.totalAmount)}
              </p>
            </div>
          </div>
        </article>
      ) : (
        <article className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111111]">
          <p className="text-sm text-slate-600 dark:text-slate-400">Şu an aktif şarj oturumunuz yok.</p>
          <button
            type="button"
            onClick={() => onNavigate('stations')}
            className="mt-4 inline-flex rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            İstasyonları gör
          </button>
        </article>
      )}

      {recentCompleted.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Son oturumlar
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              Tümünü gör
            </button>
          </div>
          <ul className="space-y-3">
            {recentCompleted.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#111111]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{session.stationName}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatDate(session.startTime)}</p>
                </div>
                <div className="ml-4 shrink-0 text-right">
                  <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                    {session.totalKwh.toFixed(1)} kWh
                  </p>
                  <SessionStatusBadge status={session.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
