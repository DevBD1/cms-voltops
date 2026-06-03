import { useEffect, useState } from 'react';
import { EmptyState } from '../../../components/customer/EmptyState';
import { TicketPriorityBadge, TicketStatusBadge } from '../../../components/customer/StatusBadge';
import { customerTicketsApi } from '../../../lib/api';
import { formatDate } from '../../../lib/formatters';
import type { Ticket } from '../../../types/db.types';

/** Map raw DB priority values → badge enum values */
function normalisePriority(raw: string): 'LOW' | 'MEDIUM' | 'CRITICAL' {
  const map: Record<string, 'LOW' | 'MEDIUM' | 'CRITICAL'> = {
    low: 'LOW',
    normal: 'MEDIUM',
    medium: 'MEDIUM',
    high: 'CRITICAL',
    critical: 'CRITICAL',
  };
  return map[raw?.toLowerCase()] ?? 'MEDIUM';
}

/** Map raw DB status values → badge enum values */
function normaliseStatus(raw: string): 'OPEN' | 'IN_PROGRESS' | 'CLOSED' {
  const map: Record<string, 'OPEN' | 'IN_PROGRESS' | 'CLOSED'> = {
    open: 'OPEN',
    in_progress: 'IN_PROGRESS',
    resolved: 'CLOSED',
    closed: 'CLOSED',
  };
  return map[raw?.toLowerCase()] ?? 'OPEN';
}

export function SupportView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerTicketsApi
      .list()
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Destek</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Destek talepleriniz ve durumları
        </p>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : tickets.length === 0 ? (
        <EmptyState message="Açık destek talebiniz bulunmuyor." />
      ) : (
        <ul className="space-y-4">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-ink"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900 dark:text-white">{ticket.title}</h2>
                <TicketStatusBadge status={normaliseStatus(ticket.status)} />
              </div>
              {ticket.stationName && (
                <p className="mt-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  İstasyon: {ticket.stationName}
                </p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {ticket.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <TicketPriorityBadge priority={normalisePriority(ticket.priority)} />
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
