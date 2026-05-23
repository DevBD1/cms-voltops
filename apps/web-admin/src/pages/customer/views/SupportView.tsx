import { TicketStatusBadge } from '../../../components/customer/StatusBadge';
import { getUserTickets } from '../../../lib/customer-data';

interface SupportViewProps {
  userId: string;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

const PRIORITY_LABELS = {
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  CRITICAL: 'Kritik',
} as const;

export function SupportView({ userId }: SupportViewProps) {
  const tickets = getUserTickets(userId);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Destek</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Destek talepleriniz ve durumları</p>
      </section>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#111111]">
          <p className="text-sm text-slate-600 dark:text-slate-400">Açık destek talebiniz bulunmuyor.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111111]"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-slate-900 dark:text-white">{ticket.subject}</h2>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {ticket.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>Öncelik: {PRIORITY_LABELS[ticket.priority]}</span>
                <span>{formatDate(ticket.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
