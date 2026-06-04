import { useEffect, useState } from 'react';
import { EmptyState } from '../../../components/customer/EmptyState';
import { SessionStatusBadge } from '../../../components/customer/StatusBadge';
import { sessionsApi } from '../../../lib/api';
import { formatCurrency, formatDateTime, formatKwh } from '../../../lib/formatters';
import type { Session } from '../../../types/db.types';

export function HistoryView() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionsApi
      .list()
      .then((all) => setSessions(all.filter((s) => s.status !== 'ACTIVE')))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Şarj geçmişi
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Tamamlanan ve başarısız oturumlarınız
        </p>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : sessions.length === 0 ? (
        <EmptyState message="Henüz tamamlanmış şarj oturumunuz yok." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-white/7">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200/80 bg-slate-100/60 dark:border-white/7 dark:bg-white/4">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">İstasyon</th>
                <th className="hidden px-4 py-3 font-medium text-slate-600 sm:table-cell dark:text-slate-400">Tarih</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">kWh</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tutar</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 bg-white dark:divide-white/6 dark:bg-night-raised">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{session.stationName}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 sm:hidden dark:text-slate-400">
                      {formatDateTime(session.startedAt)}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell dark:text-slate-400">
                    {formatDateTime(session.startedAt)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                    {formatKwh(session.energyKwh)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                    {session.totalPrice != null ? formatCurrency(parseFloat(session.totalPrice)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <SessionStatusBadge status={session.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
