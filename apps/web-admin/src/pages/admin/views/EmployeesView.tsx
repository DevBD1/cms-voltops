import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import {
  BTN_DANGER,
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_TABLE_ACTION,
  FormField,
  INPUT_CLS,
  SELECT_CLS,
  SlideOver,
} from '../../../components/admin/SlideOver';
import { TicketPriorityBadge, TicketStatusBadge } from '../../../components/customer/StatusBadge';
import { employeesApi, usersApi } from '../../../lib/api';
import { formatDate } from '../../../lib/formatters';
import type { Employee, EmployeeDetail, User } from '../../../types/db.types';

// ─── Promote-user form ────────────────────────────────────────────────────────

interface PromoteForm {
  userId: string;
  employeeCode: string;
  department: string;
  jobTitle: string;
  hireDate: string;
}

const EMPTY_PROMOTE: PromoteForm = {
  userId: '',
  employeeCode: '',
  department: '',
  jobTitle: '',
  hireDate: new Date().toISOString().split('T')[0],
};

// ─── Main view ────────────────────────────────────────────────────────────────

export function EmployeesView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Promote-user drawer
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState<PromoteForm>(EMPTY_PROMOTE);
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  // Deactivate spinner
  const [togglingId, setTogglingId] = useState<number | null>(null);

  function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    Promise.all([employeesApi.list(), usersApi.list()])
      .then(([emps, usrs]) => {
        setError(null);
        setEmployees(emps);
        setUsers(usrs);
      })
      .catch(() => setError('Personel listesi yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(true); }, []);

  async function openDetail(emp: Employee) {
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const d = await employeesApi.get(emp.id);
      setDetail(d);
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleToggleStatus(emp: Employee) {
    setTogglingId(emp.id);
    const next = emp.status === 'active' ? 'inactive' : 'active';
    try {
      await employeesApi.update(emp.id, { status: next });
      load(false);
    } catch {
      /* non-critical */
    } finally {
      setTogglingId(null);
    }
  }

  async function handlePromote(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setPromoteError(null);
    if (!promoteForm.userId) {
      setPromoteError('Lütfen bir kullanıcı seçiniz.');
      return;
    }
    setPromoting(true);
    try {
      await employeesApi.create({
        userId: Number(promoteForm.userId),
        employeeCode: promoteForm.employeeCode.trim().toUpperCase(),
        department: promoteForm.department.trim(),
        jobTitle: promoteForm.jobTitle.trim(),
        hireDate: promoteForm.hireDate,
      });
      setPromoteOpen(false);
      load(false);
    } catch (err: unknown) {
      setPromoteError(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setPromoting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  const activeCount = employees.filter((e) => e.status === 'active').length;

  const employeeUserIds = new Set(employees.map((e) => e.id));
  const employeeEmails = new Set(employees.map((e) => e.email));
  const nonEmployeeUsers = users.filter((u) => !employeeEmails.has(u.email));

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {employees.length} personel · {activeCount} aktif
        </p>
        <button type="button" onClick={() => { setPromoteForm(EMPTY_PROMOTE); setPromoteError(null); setPromoteOpen(true); }} className={BTN_PRIMARY}>
          <PlusIcon />
          Personel Ekle / Admin Yap
        </button>
      </div>

      {/* ── Employee table ── */}
      <AdminDataTable
        headers={['Ad Soyad', 'E-posta', 'Unvan', 'Departman', 'Durum', 'İşlemler']}
        emptyMessage="Kayıtlı personel yok."
        rows={employees.map((emp) => [
          <span className="font-medium text-slate-900 dark:text-white">{emp.fullName}</span>,
          <span className="font-mono text-xs">{emp.email}</span>,
          <span className="text-slate-700 dark:text-slate-300">{emp.jobTitle}</span>,
          <span className="text-slate-600 dark:text-slate-400">{emp.department}</span>,
          emp.status === 'active' ? (
            <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              Aktif
            </span>
          ) : (
            <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              Pasif
            </span>
          ),
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openDetail(emp)} className={BTN_TABLE_ACTION}>
              Görevler
            </button>
            <button
              type="button"
              disabled={togglingId === emp.id}
              onClick={() => handleToggleStatus(emp)}
              className={emp.status === 'active' ? BTN_DANGER : BTN_TABLE_ACTION}
            >
              {togglingId === emp.id ? '…' : emp.status === 'active' ? 'Pasifleştir' : 'Aktifleştir'}
            </button>
          </div>,
        ])}
      />

      {/* ── Employee detail drawer ── */}
      <SlideOver
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail?.fullName ?? 'Personel Detayı'}
        description={detail ? `${detail.jobTitle} · ${detail.department}` : ''}
        width="lg"
        footer={
          <div className="flex justify-end">
            <button type="button" onClick={() => setDetailOpen(false)} className={BTN_GHOST}>
              Kapat
            </button>
          </div>
        }
      >
        {detailLoading && <p className="text-sm text-slate-500">Yükleniyor…</p>}

        {detail && !detailLoading && (
          <div className="space-y-7">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/50">
              <InfoRow label="Personel Kodu" value={detail.employeeCode} mono />
              <InfoRow label="E-posta" value={detail.email} mono />
              <InfoRow label="İşe Giriş" value={detail.hireDate ? formatDate(detail.hireDate) : '—'} />
              <InfoRow label="Durum" value={detail.status === 'active' ? 'Aktif' : 'Pasif'} />
            </div>

            {/* Assigned stations */}
            <Section
              title="Atanan İstasyonlar"
              count={detail.assignedStations.length}
              empty="Atanan istasyon yok."
            >
              {detail.assignedStations.map((s) => (
                <div key={s.stationCode} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{s.stationName}</p>
                    <p className="font-mono text-xs text-slate-400">{s.stationCode}</p>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {s.assignmentRole}
                  </span>
                </div>
              ))}
            </Section>

            {/* Assigned maintenance */}
            <Section
              title="Bakım Görevleri"
              count={detail.assignedMaintenance.length}
              empty="Atanan bakım görevi yok."
            >
              {detail.assignedMaintenance.map((m) => (
                <div key={m.id} className="border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {m.stationName ?? m.stationCode}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {m.maintenanceType} · {m.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {m.status}
                    </span>
                  </div>
                  {m.scheduledDate && (
                    <p className="mt-0.5 text-xs text-slate-400">
                      Plan: {formatDate(m.scheduledDate)}
                      {m.completedDate && ` · Tamamlandı: ${formatDate(m.completedDate)}`}
                    </p>
                  )}
                </div>
              ))}
            </Section>

            {/* Assigned tickets */}
            <Section
              title="Destek Talepleri"
              count={detail.assignedTickets.length}
              empty="Atanan destek talebi yok."
            >
              {detail.assignedTickets.map((t) => (
                <div key={t.id} className="border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        #{t.id} · {t.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t.userFullName}{t.stationName ? ` · ${t.stationName}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <TicketStatusBadge status={t.status} />
                      <TicketPriorityBadge priority={t.priority} />
                    </div>
                  </div>
                </div>
              ))}
            </Section>
          </div>
        )}
      </SlideOver>

      {/* ── Promote / create employee drawer ── */}
      <SlideOver
        open={promoteOpen}
        onClose={() => setPromoteOpen(false)}
        title="Personel Ekle / Admin Yap"
        description="Mevcut bir kullanıcıya personel yetkisi verin."
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPromoteOpen(false)} className={BTN_GHOST}>
              İptal
            </button>
            <button form="promote-form" type="submit" disabled={promoting} className={BTN_PRIMARY}>
              {promoting ? 'Kaydediliyor…' : 'Personel Yap'}
            </button>
          </div>
        }
      >
        <form id="promote-form" onSubmit={handlePromote} className="space-y-5">
          <FormField label="Kullanıcı">
            <select
              required
              value={promoteForm.userId}
              onChange={(e) => setPromoteForm({ ...promoteForm, userId: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="">— Kullanıcı seçin —</option>
              {/* Non-employee users first, then all users */}
              {nonEmployeeUsers.length > 0 && (
                <optgroup label="Personel kaydı olmayan kullanıcılar">
                  {nonEmployeeUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Tüm kullanıcılar">
                {users.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.firstName} {u.lastName} ({u.email})
                  </option>
                ))}
              </optgroup>
            </select>
          </FormField>

          <FormField label="Personel Kodu" hint="(örn. EMP-001)">
            <input
              required
              placeholder="EMP-001"
              value={promoteForm.employeeCode}
              onChange={(e) => setPromoteForm({ ...promoteForm, employeeCode: e.target.value })}
              className={INPUT_CLS}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Departman">
              <input
                required
                placeholder="Teknik"
                value={promoteForm.department}
                onChange={(e) => setPromoteForm({ ...promoteForm, department: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="Unvan">
              <input
                required
                placeholder="Teknisyen"
                value={promoteForm.jobTitle}
                onChange={(e) => setPromoteForm({ ...promoteForm, jobTitle: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
          </div>

          <FormField label="İşe Giriş Tarihi">
            <input
              required
              type="date"
              value={promoteForm.hireDate}
              onChange={(e) => setPromoteForm({ ...promoteForm, hireDate: e.target.value })}
              className={INPUT_CLS}
            />
          </FormField>

          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-xs text-amber-800 dark:text-amber-400">
              <span className="font-semibold">Not:</span> Personel kaydı oluşturulan kullanıcı, bir sonraki girişinde otomatik olarak yönetici yetkisi kazanır. Mevcut oturum tokenları güncellenmez.
            </p>
          </div>

          {promoteError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {promoteError}
            </p>
          )}
        </form>
      </SlideOver>
    </div>
  );
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="rounded-md border border-slate-200 px-4 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
