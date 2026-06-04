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

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Düşük'  },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'Yüksek' },
];

export function SupportView() {
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);

  // form fields
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [priority, setPriority]       = useState('normal');
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  function loadTickets() {
    setLoading(true);
    customerTicketsApi
      .list()
      .then(setTickets)
      .catch(() => setTickets([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTickets();
  }, []);

  function openForm() {
    setTitle('');
    setDescription('');
    setStationCode('');
    setPriority('normal');
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setFormError(null);
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('Başlık gereklidir.');
      return;
    }
    if (!description.trim()) {
      setFormError('Açıklama gereklidir.');
      return;
    }

    setSubmitting(true);
    try {
      await customerTicketsApi.create({
        title:       title.trim(),
        description: description.trim(),
        priority,
        stationCode: stationCode.trim() || undefined,
      });
      closeForm();
      loadTickets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Talep oluşturulamadı.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Destek</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Destek talepleriniz ve durumları
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openForm}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          {showForm ? 'Vazgeç' : '+ Yeni Talep'}
        </button>
      </section>

      {/* ── Create-ticket form ───────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-6 dark:border-white/7 dark:bg-night-raised"
        >
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Yeni Destek Talebi
          </h2>

          {/* Title */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Başlık <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kısaca sorununuzu belirtin"
              maxLength={150}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-night dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Açıklama <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sorununuzu detaylıca açıklayın"
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-night dark:text-white dark:placeholder-slate-500"
            />
          </div>

          {/* Station code + priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                İstasyon kodu <span className="text-slate-400">(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={stationCode}
                onChange={(e) => setStationCode(e.target.value)}
                placeholder="Örn: TR-16-NIL-01"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-night dark:text-white dark:placeholder-slate-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Öncelik
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/10 dark:bg-night dark:text-white"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Inline error */}
          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/8"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Gönderiliyor…' : 'Talebi Gönder'}
            </button>
          </div>
        </form>
      )}

      {/* ── Ticket list ──────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-slate-500">Yükleniyor…</p>
      ) : tickets.length === 0 ? (
        <EmptyState message="Açık destek talebiniz bulunmuyor." />
      ) : (
        <ul className="space-y-4">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="rounded-xl border border-slate-200/80 bg-white p-5 dark:border-white/7 dark:bg-night-raised"
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
