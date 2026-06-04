import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import {
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_TABLE_ACTION,
  FormField,
  INPUT_CLS,
  SELECT_CLS,
  SlideOver,
  StatusMenu,
} from '../../../components/admin/SlideOver';
import { MaintenanceStatusBadge } from '../../../components/customer/StatusBadge';
import { employeesApi, maintenanceApi, stationsApi } from '../../../lib/api';
import { formatDate } from '../../../lib/formatters';
import type { Employee, MaintenanceRecord, Station } from '../../../types/db.types';

type RawMaintStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

const MAINT_STATUS_OPTIONS: { value: RawMaintStatus; label: string }[] = [
  { value: 'scheduled', label: '📅 Planlandı' },
  { value: 'in_progress', label: '⚙ Devam Ediyor' },
  { value: 'completed', label: '✓ Tamamlandı' },
  { value: 'cancelled', label: '✕ İptal' },
];

const MAINT_TYPE_OPTIONS = [
  'Rutin Bakım',
  'Arıza Giderme',
  'Yazılım Güncelleme',
  'Donanım Değişimi',
  'Temizlik',
  'Diğer',
];

interface MaintForm {
  stationCode: string;
  plugCode: string;
  employeeId: string;
  maintenanceType: string;
  description: string;
  scheduledDate: string;
}

const EMPTY: MaintForm = {
  stationCode: '',
  plugCode: '',
  employeeId: '',
  maintenanceType: 'Rutin Bakım',
  description: '',
  scheduledDate: '',
};

export function MaintenanceView() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<MaintForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    Promise.all([maintenanceApi.list(), stationsApi.list(), employeesApi.list()])
      .then(([m, s, e]) => {
        setError(null);
        setRecords(m);
        setStations(s);
        setEmployees(e.filter((emp) => emp.status === 'active'));
      })
      .catch(() => setError('Bakım kayıtları yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(true); }, []);

  function openCreate() {
    setForm(EMPTY);
    setFormError(null);
    setDrawerOpen(true);
  }

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    if (!form.stationCode) {
      setFormError('Lütfen bir istasyon seçiniz.');
      return;
    }
    setSaving(true);
    try {
      await maintenanceApi.create({
        stationCode: form.stationCode,
        plugCode: form.plugCode || undefined,
        employeeId: form.employeeId ? Number(form.employeeId) : undefined,
        maintenanceType: form.maintenanceType,
        description: form.description,
        scheduledDate: form.scheduledDate,
      });
      setDrawerOpen(false);
      load(false); // don't show spinner — keeps table visible while refreshing
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Kaydetme başarısız.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: RawMaintStatus) {
    const completedDate =
      status === 'completed' ? new Date().toISOString().split('T')[0] : undefined;
    try {
      await maintenanceApi.update(id, { status, completedDate });
      load(false);
    } catch {
      /* non-critical */
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  const openCount = records.filter(
    (r) => r.status !== 'completed' && r.status !== 'cancelled',
  ).length;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {records.length} kayıt · {openCount} açık
        </p>
        <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
          <PlusIcon />
          Bakım Kaydı Oluştur
        </button>
      </div>

      <AdminDataTable
        headers={['İstasyon', 'Soket', 'Teknisyen', 'Tip', 'Açıklama', 'Durum', 'Plan', 'Çözüm']}
        emptyMessage="Kayıtlı bakım kaydı yok."
        rows={records.map((r) => [
          r.stationName ?? (
            <span className="font-mono text-xs text-slate-400">{r.stationCode}</span>
          ),
          r.plugCode ? (
            <span className="font-mono text-xs">{r.plugCode}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
          r.technicianName ?? <span className="text-slate-400">—</span>,
          <span className="text-xs text-slate-600 dark:text-slate-400">{r.maintenanceType}</span>,
          <span className="max-w-[160px] truncate text-slate-700 dark:text-slate-300">
            {r.description}
          </span>,
          <StatusMenu<RawMaintStatus>
            options={MAINT_STATUS_OPTIONS}
            onSelect={(v) => handleStatusChange(r.id, v)}
          >
            <MaintenanceStatusBadge status={r.status} />
          </StatusMenu>,
          r.scheduledDate ? formatDate(r.scheduledDate) : <span className="text-slate-400">—</span>,
          r.completedDate ? (
            formatDate(r.completedDate)
          ) : (
            <span className="text-slate-400">—</span>
          ),
        ])}
      />

      {/* ── Create drawer ── */}
      <SlideOver
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Bakım Kaydı Oluştur"
        description="Yeni bir bakım veya onarım kaydı oluşturun."
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDrawerOpen(false)} className={BTN_GHOST}>
              İptal
            </button>
            <button form="maint-form" type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? 'Kaydediliyor…' : 'Oluştur'}
            </button>
          </div>
        }
      >
        <form id="maint-form" onSubmit={handleSave} className="space-y-5">
          <FormField label="İstasyon">
            <select
              required
              value={form.stationCode}
              onChange={(e) => setForm({ ...form, stationCode: e.target.value, plugCode: '' })}
              className={SELECT_CLS}
            >
              <option value="">— İstasyon seçin —</option>
              {stations.map((s) => (
                <option key={s.stationCode} value={s.stationCode}>
                  {s.name} ({s.stationCode})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Soket Kodu" hint="(opsiyonel)">
            <input
              placeholder="TR-34-IST-01-P1"
              value={form.plugCode}
              onChange={(e) => setForm({ ...form, plugCode: e.target.value })}
              className={INPUT_CLS}
            />
          </FormField>

          <FormField label="Bakım Tipi">
            <select
              value={form.maintenanceType}
              onChange={(e) => setForm({ ...form, maintenanceType: e.target.value })}
              className={SELECT_CLS}
            >
              {MAINT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Açıklama">
            <textarea
              required
              rows={3}
              placeholder="Bakım detaylarını açıklayınız…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={INPUT_CLS + ' resize-none'}
            />
          </FormField>

          <FormField label="Planlanan Tarih">
            <input
              required
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
              className={INPUT_CLS}
            />
          </FormField>

          <FormField label="Teknisyen" hint="(opsiyonel)">
            <select
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              className={SELECT_CLS}
            >
              <option value="">— Atanmamış —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={String(emp.id)}>
                  {emp.fullName} ({emp.jobTitle})
                </option>
              ))}
            </select>
          </FormField>

          {formError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {formError}
            </p>
          )}
        </form>
      </SlideOver>
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
