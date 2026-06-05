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
import { SocketStatusBadge } from '../../../components/customer/StatusBadge';
import { plugsApi, stationsApi } from '../../../lib/api';
import { formatPlugType, formatPowerKw } from '../../../lib/formatters';
import type { Plug, Station } from '../../../types/db.types';

type RawPlugStatus = 'available' | 'in_use' | 'fault' | 'offline';

const PLUG_STATUS_OPTIONS: { value: RawPlugStatus; label: string }[] = [
  { value: 'available', label: '✓ Müsait' },
  { value: 'in_use', label: '⚡ Şarjda' },
  { value: 'fault', label: '✕ Arızalı' },
  { value: 'offline', label: '○ Çevrimdışı' },
];

const PLUG_TYPE_OPTIONS = [
  { value: 'AC_TYPE2', label: 'AC Type 2' },
  { value: 'AC_TYPE1', label: 'AC Type 1' },
  { value: 'DC_CCS2', label: 'DC CCS2' },
  { value: 'DC_CHADEMO', label: 'DC CHAdeMO' },
  { value: 'DC_GB_T', label: 'DC GB/T' },
];

interface PlugForm {
  plugCode: string;
  plugType: string;
  powerKw: string;
}

const EMPTY_PLUG: PlugForm = { plugCode: '', plugType: 'AC_TYPE2', powerKw: '' };

export function DevicesView() {
  const [plugs, setPlugs] = useState<Plug[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [targetStation, setTargetStation] = useState<Station | null>(null);
  const [form, setForm] = useState<PlugForm>(EMPTY_PLUG);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    Promise.all([plugsApi.list(), stationsApi.list()])
      .then(([p, s]) => {
        setError(null);
        setPlugs(p);
        setStations(s);
      })
      .catch(() => setError('Cihazlar yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(true); }, []);

  function openAddPlug(station: Station) {
    setTargetStation(station);
    setForm(EMPTY_PLUG);
    setFormError(null);
    setDrawerOpen(true);
  }

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!targetStation) return;
    setFormError(null);
    const kw = parseFloat(form.powerKw);
    if (isNaN(kw) || kw <= 0) {
      setFormError('Geçerli bir güç değeri (kW) giriniz.');
      return;
    }
    setSaving(true);
    try {
      await plugsApi.create({
        plugCode: form.plugCode.trim().toUpperCase(),
        stationCode: targetStation.stationCode,
        plugType: form.plugType,
        powerKw: kw,
      });
      setDrawerOpen(false);
      load(false);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Kaydetme başarısız. Lütfen tekrar deneyin.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(plugCode: string, status: RawPlugStatus) {
    try {
      await plugsApi.setStatus(plugCode, status);
      load(false);
    } catch {
      /* non-critical */
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  const byStation = plugs.reduce<Record<string, Plug[]>>((acc, plug) => {
    (acc[plug.stationCode] ??= []).push(plug);
    return acc;
  }, {});

  const stationMap = Object.fromEntries(stations.map((s) => [s.stationCode, s]));

  const allCodes = [
    ...new Set([...stations.map((s) => s.stationCode), ...Object.keys(byStation)]),
  ];

  return (
    <div className="space-y-8">
      {allCodes.map((code) => {
        const station = stationMap[code];
        const stationPlugs = byStation[code] ?? [];

        return (
          <section key={code}>
            {/* Station header */}
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {station?.name ?? code}
                </h2>
                <span className="font-mono text-xs text-slate-400">{code}</span>
              </div>
              {station && (
                <button
                  type="button"
                  onClick={() => openAddPlug(station)}
                  className={BTN_TABLE_ACTION + ' whitespace-nowrap'}
                >
                  + Soket Ekle
                </button>
              )}
            </div>

            {stationPlugs.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400 dark:border-slate-700">
                Bu istasyona henüz soket eklenmemiş.
              </p>
            ) : (
              <AdminDataTable
                headers={['Soket Kodu', 'Tip', 'Güç', 'Akım', 'Durum', 'İşlemler']}
                rows={stationPlugs.map((p) => [
                  <span className="font-mono text-xs">{p.plugCode}</span>,
                  formatPlugType(p.plugType) ?? p.plugType,
                  <span className="font-mono text-sm">{formatPowerKw(p.powerKw)}</span>,
                  <span className="font-mono text-xs text-slate-500">{p.currentType}</span>,
                  <StatusMenu<RawPlugStatus>
                    options={PLUG_STATUS_OPTIONS}
                    onSelect={(v) => handleStatusChange(p.plugCode, v)}
                  >
                    <SocketStatusBadge status={p.status} />
                  </StatusMenu>,
                  <span className="text-xs text-slate-400 dark:text-slate-600">—</span>,
                ])}
              />
            )}
          </section>
        );
      })}

      {allCodes.length === 0 && (
        <p className="text-sm text-slate-500">Henüz istasyon veya soket eklenmemiş.</p>
      )}

      {/* ── Add Plug drawer ── */}
      <SlideOver
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Soket Ekle"
        description={targetStation ? `${targetStation.name} istasyonuna yeni soket ekleyin.` : ''}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDrawerOpen(false)} className={BTN_GHOST}>
              İptal
            </button>
            <button form="plug-form" type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? 'Kaydediliyor…' : 'Ekle'}
            </button>
          </div>
        }
      >
        <form id="plug-form" onSubmit={handleSave} className="space-y-5">
          <FormField label="Soket Kodu" hint="(örn. TR-34-IST-01-P1)">
            <input
              required
              placeholder="TR-34-IST-01-P1"
              value={form.plugCode}
              onChange={(e) => setForm({ ...form, plugCode: e.target.value })}
              className={INPUT_CLS}
            />
          </FormField>

          <FormField label="Soket Tipi">
            <select
              value={form.plugType}
              onChange={(e) => setForm({ ...form, plugType: e.target.value })}
              className={SELECT_CLS}
            >
              {PLUG_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Güç (kW)">
            <input
              required
              type="number"
              step="any"
              min="1"
              placeholder="22"
              value={form.powerKw}
              onChange={(e) => setForm({ ...form, powerKw: e.target.value })}
              className={INPUT_CLS}
            />
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
