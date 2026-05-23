import { SessionStatusBadge } from '../../../components/customer/StatusBadge';
import { getSessionHistory } from '../../../lib/customer-data';

interface HistoryViewProps {
  userId: string;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

export function HistoryView({ userId }: HistoryViewProps) {
  const sessions = getSessionHistory(userId);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Şarj geçmişi</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Tamamlanan ve başarısız oturumlarınız
        </p>
      </section>

      {sessions.length === 0 ? (
        <EmptyState message="Henüz tamamlanmış şarj oturumunuz yok." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">İstasyon</th>
                <th className="hidden px-4 py-3 font-medium text-slate-600 sm:table-cell dark:text-slate-400">
                  Tarih
                </th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">kWh</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tutar</th>
                <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-[#111111]">
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900 dark:text-white">{session.stationName}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500 sm:hidden dark:text-slate-400">
                      {formatDate(session.startTime)}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell dark:text-slate-400">
                    {formatDate(session.startTime)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                    {session.totalKwh.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">
                    {formatCurrency(session.totalAmount)}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111111]">
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  );
}
