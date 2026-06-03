import { useEffect, useState } from 'react';
import { EmptyState } from '../../../components/customer/EmptyState';
import { TicketPriorityBadge, TicketStatusBadge } from '../../../components/customer/StatusBadge';
import { ticketsApi } from '../../../lib/api';
import { formatDate } from '../../../lib/formatters';
import type { Ticket } from '../../../types/db.types';

export function SupportView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ticketsApi
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
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111111]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900 dark:text-white">{ticket.title}</h2>
                <TicketStatusBadge status={ticket.status} />
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
                <TicketPriorityBadge priority={ticket.priority} />
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
