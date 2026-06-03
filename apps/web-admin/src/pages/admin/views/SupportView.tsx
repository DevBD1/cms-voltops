import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../../../components/customer/StatusBadge';
import { ticketsApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/formatters';
import type { Ticket } from '../../../types/db.types';

export function SupportView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ticketsApi
      .list()
      .then(setTickets)
      .catch(() => setError('Destek talepleri yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <AdminDataTable
      headers={['Kullanıcı', 'Konu', 'İstasyon', 'Öncelik', 'Durum', 'Tarih']}
      emptyMessage="Açık destek talebi yok."
      rows={tickets.map((t) => [
        t.userFullName,
        <span className="max-w-xs truncate font-medium text-slate-900 dark:text-white">
          {t.title}
        </span>,
        t.stationName ?? <span className="text-slate-400">—</span>,
        <TicketPriorityBadge priority={t.priority} />,
        <TicketStatusBadge status={t.status} />,
        formatDateTime(t.createdAt),
      ])}
    />
  );
}
