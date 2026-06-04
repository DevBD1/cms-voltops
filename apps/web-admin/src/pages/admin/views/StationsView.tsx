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
  StatusMenu,
} from '../../../components/admin/SlideOver';
import { StationStatusBadge } from '../../../components/customer/StatusBadge';
import { stationsApi } from '../../../lib/api';
import type { Station } from '../../../types/db.types';

type RawStationStatus = 'active' | 'maintenance' | 'offline';

const STATUS_OPTIONS: { value: RawStationStatus; label: string }[] = [
  { value: 'active', label: '✓ Aktif' },
  { value: 'maintenance', label: '⚙ Bakımda' },
  { value: 'offline', label: '✕ Çevrimdışı' },
];

interface StationForm {
  stationCode: string;
  name: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
}

const EMPTY: StationForm = {
  stationCode: '',
  name: '',
  city: '',
  district: '',
  latitude: '',
  longitude: '',
};

export function StationsView() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [form, setForm] = useState<StationForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline delete confirmation: holds the stationCode currently awaiting confirm
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    stationsApi
      .list()
      .then((data) => { setError(null); setStations(data); })
      .catch(() => setError('İstasyonlar yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(true); }, []);

  function openCreate() {
    setEditingCode(null);
    setForm(EMPTY);
    setFormError(null);
    setDrawerOpen(true);
  }

  function openEdit(s: Station) {
    setEditingCode(s.stationCode);
    setForm({
      stationCode: s.stationCode,
      name: s.name,
      city: s.city,
      district: s.district ?? '',
      latitude: s.latitude,
      longitude: s.longitude,
    });
    setFormError(null);
    setDrawerOpen(true);
  }

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setFormError('Geçerli enlem ve boylam değerleri giriniz.');
      return;
    }
    setSaving(true);
    try {
      if (editingCode) {
        await stationsApi.update(editingCode, {
          name: form.name,
          city: form.city,
          district: form.district || form.city,
          latitude: lat,
          longitude: lng,
        });
      } else {
        await stationsApi.create({
          stationCode: form.stationCode.trim().toUpperCase(),
          name: form.name,
          city: form.city,
          district: form.district || form.city,
          latitude: lat,
          longitude: lng,
        });
      }
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

  async function handleDelete(stationCode: string) {
    setDeleting(true);
    setDeleteError(null);
    try {
      await stationsApi.delete(stationCode);
      setDeleteConfirmCode(null);
      load(false);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Silme işlemi başarısız.');
      setDeleteConfirmCode(null); // collapse confirm so the error banner shows
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(stationCode: string, status: RawStationStatus) {
    try {
      await stationsApi.setStatus(stationCode, status);
      load(false);
    } catch {
      /* non-critical — table stays stale */
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <div>
      {/* ── Delete error banner ── */}
      {deleteError && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-sm text-red-700 dark:text-red-400">{deleteError}</p>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            className="ml-auto shrink-0 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {stations.length} istasyon kayıtlı
        </p>
        <button type="button" onClick={openCreate} className={BTN_PRIMARY}>
          <PlusIcon />
          İstasyon Ekle
        </button>
      </div>

      {/* ── Table ── */}
      <AdminDataTable
        headers={['Kod', 'İstasyon Adı', 'Şehir / İlçe', 'Durum', 'Soket', 'Arızalı', 'İşlemler']}
        emptyMessage="Henüz istasyon eklenmemiş."
        rows={stations.map((s) => [
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
            {s.stationCode}
          </span>,
          <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>,
          `${s.city}${s.district ? ` / ${s.district}` : ''}`,
          <StatusMenu<RawStationStatus>
            options={STATUS_OPTIONS}
            onSelect={(v) => handleStatusChange(s.stationCode, v)}
          >
            <StationStatusBadge status={s.status} />
          </StatusMenu>,
          <span className="font-mono text-sm">{s.totalPlugs}</span>,
          s.faultyPlugs > 0 ? (
            <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
              {s.faultyPlugs}
            </span>
          ) : (
            <span className="font-mono text-sm text-slate-400">0</span>
          ),
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openEdit(s)} className={BTN_TABLE_ACTION}>
              Düzenle
            </button>
            {deleteConfirmCode === s.stationCode ? (
              <>
                <span className="text-xs text-slate-500">Emin misin?</span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDelete(s.stationCode)}
                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  {deleting ? '…' : 'Evet'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmCode(null)}
                  className={BTN_TABLE_ACTION}
                >
                  Hayır
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setDeleteError(null); setDeleteConfirmCode(s.stationCode); }}
                className={BTN_DANGER}
              >
                Sil
              </button>
            )}
          </div>,
        ])}
      />

      {/* ── Create / Edit drawer ── */}
      <SlideOver
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingCode ? 'İstasyon Düzenle' : 'Yeni İstasyon'}
        description={
          editingCode
            ? `${editingCode} kodlu istasyonu düzenleyin.`
            : 'Yeni bir şarj istasyonu ekleyin.'
        }
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDrawerOpen(false)} className={BTN_GHOST}>
              İptal
            </button>
            <button
              form="station-form"
              type="submit"
              disabled={saving}
              className={BTN_PRIMARY}
            >
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        }
      >
        <form id="station-form" onSubmit={handleSave} className="space-y-5">
          {!editingCode && (
            <FormField label="İstasyon Kodu" hint="(örn. TR-34-IST-01)">
              <input
                required
                placeholder="TR-34-IST-01"
                value={form.stationCode}
                onChange={(e) => setForm({ ...form, stationCode: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
          )}

          <FormField label="İstasyon Adı">
            <input
              required
              placeholder="Nilüfer Merkez Şarj İstasyonu"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={INPUT_CLS}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Şehir">
              <input
                required
                placeholder="Bursa"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="İlçe">
              <input
                placeholder="Nilüfer"
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Enlem">
              <input
                required
                type="number"
                step="any"
                placeholder="40.2340"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="Boylam">
              <input
                required
                type="number"
                step="any"
                placeholder="28.8790"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
          </div>

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
