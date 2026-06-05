import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import {
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_TABLE_ACTION,
  SELECT_CLS,
  SlideOver,
  StatusMenu,
} from '../../../components/admin/SlideOver';
import {
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../../../components/customer/StatusBadge';
import { employeesApi, ticketsApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/formatters';
import type { Employee, Ticket } from '../../../types/db.types';

type RawTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type RawTicketPriority = 'low' | 'normal' | 'high' | 'critical';

const TICKET_STATUS_OPTIONS: { value: RawTicketStatus; label: string }[] = [
  { value: 'open', label: '📬 Açık' },
  { value: 'in_progress', label: '⚙ İşlemde' },
  { value: 'resolved', label: '✓ Çözüldü' },
  { value: 'closed', label: '✕ Kapatıldı' },
];

const TICKET_PRIORITY_OPTIONS: { value: RawTicketPriority; label: string }[] = [
  { value: 'low', label: 'Düşük' },
  { value: 'normal', label: 'Orta' },
  { value: 'high', label: 'Yüksek' },
  { value: 'critical', label: 'Kritik' },
];

// Reverse-map normalised status → raw DB value
const STATUS_TO_RAW: Record<string, RawTicketStatus> = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
};

// Reverse-map normalised priority → raw DB value
const PRIORITY_TO_RAW: Record<string, RawTicketPriority> = {
  LOW: 'low',
  MEDIUM: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export function SupportView() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [newStatus, setNewStatus] = useState<RawTicketStatus>('open');
  const [newPriority, setNewPriority] = useState<RawTicketPriority>('normal');
  const [saving, setSaving] = useState(false);

  function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    Promise.all([ticketsApi.list(), employeesApi.list()])
      .then(([t, e]) => {
        setError(null);
        setTickets(t);
        setEmployees(e.filter((emp) => emp.status === 'active'));
      })
      .catch(() => setError('Destek talepleri yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(true); }, []);

  function openDetail(t: Ticket) {
    setSelected(t);
    setAssigneeId(t.assignedEmployeeId != null ? String(t.assignedEmployeeId) : '');
    setNewStatus(STATUS_TO_RAW[t.status] ?? 'open');
    setNewPriority(PRIORITY_TO_RAW[t.priority] ?? 'normal');
    setDrawerOpen(true);
  }

  async function handleSaveDetail() {
    if (!selected) return;
    setSaving(true);
    try {
      await ticketsApi.update(selected.id, {
        status: newStatus,
        priority: newPriority,
        assignedEmployeeId: assigneeId ? Number(assigneeId) : undefined,
      });
      setDrawerOpen(false);
      load(false);
    } catch {
      /* non-critical */
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatus(ticketId: number, status: RawTicketStatus) {
    try {
      await ticketsApi.update(ticketId, { status });
      load(false);
    } catch {
      /* non-critical */
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  const openCount = tickets.filter(
    (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS',
  ).length;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {tickets.length} talep · {openCount} açık / işlemde
        </p>
      </div>

      <AdminDataTable
        headers={['Kullanıcı', 'Konu', 'İstasyon', 'Öncelik', 'Durum', 'Tarih', 'İşlemler']}
        emptyMessage="Destek talebi yok."
        rows={tickets.map((t) => [
          <span className="font-medium text-slate-900 dark:text-white">{t.userFullName}</span>,
          <span className="max-w-xs truncate text-slate-700 dark:text-slate-300">{t.title}</span>,
          t.stationName ?? <span className="text-slate-400">—</span>,
          <StatusMenu<RawTicketPriority>
            options={TICKET_PRIORITY_OPTIONS}
            onSelect={(v) =>
              ticketsApi
                .update(t.id, { priority: v })
                .then(() => load(false))
                .catch(() => {})
            }
          >
            <TicketPriorityBadge priority={t.priority} />
          </StatusMenu>,
          <StatusMenu<RawTicketStatus>
            options={TICKET_STATUS_OPTIONS}
            onSelect={(v) => handleQuickStatus(t.id, v)}
          >
            <TicketStatusBadge status={t.status} />
          </StatusMenu>,
          formatDateTime(t.createdAt),
          <button type="button" onClick={() => openDetail(t)} className={BTN_TABLE_ACTION}>
            Detay
          </button>,
        ])}
      />

      {/* ── Ticket detail drawer ── */}
      <SlideOver
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selected?.title ?? ''}
        description={selected ? `#${selected.id} · ${selected.userFullName}` : ''}
        width="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDrawerOpen(false)} className={BTN_GHOST}>
              Kapat
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDetail}
              className={BTN_PRIMARY}
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-6">
            {/* Description */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Açıklama
              </p>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
                {selected.description}
              </p>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  İstasyon
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {selected.stationName ?? selected.stationCode ?? '—'}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Oluşturulma
                </p>
                <p className="text-sm text-slate-800 dark:text-slate-200">
                  {formatDateTime(selected.createdAt)}
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Durum
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as RawTicketStatus)}
                className={SELECT_CLS}
              >
                {TICKET_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Öncelik
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as RawTicketPriority)}
                className={SELECT_CLS}
              >
                {TICKET_PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assign employee */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Atanan Personel
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="">— Atanmamış —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.fullName} ({emp.jobTitle})
                  </option>
                ))}
              </select>
              {employees.length === 0 && (
                <p className="mt-1 text-xs text-slate-400">Aktif personel bulunamadı.</p>
              )}
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
}
