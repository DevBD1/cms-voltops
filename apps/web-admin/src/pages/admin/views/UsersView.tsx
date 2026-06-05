import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import {
  BTN_DANGER,
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_TABLE_ACTION,
  FormField,
  INPUT_CLS,
  SlideOver,
} from '../../../components/admin/SlideOver';
import { UserRoleBadge } from '../../../components/customer/StatusBadge';
import { usersApi } from '../../../lib/api';
import { formatDate } from '../../../lib/formatters';
import type { User } from '../../../types/db.types';

interface UserEditForm {
  firstName: string;
  lastName: string;
  phone: string;
}

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserEditForm>({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Ban/unban spinner per user
  const [togglingId, setTogglingId] = useState<number | null>(null);

  function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    usersApi
      .list()
      .then((data) => { setError(null); setUsers(data); })
      .catch(() => setError('Kullanıcılar yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(true); }, []);

  function openEdit(u: User) {
    setEditingUser(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? '' });
    setFormError(null);
    setDrawerOpen(true);
  }

  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);
    setSaving(true);
    try {
      await usersApi.update(editingUser.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
      });
      setDrawerOpen(false);
      load(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Kaydetme başarısız.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(u: User) {
    setTogglingId(u.id);
    try {
      await usersApi.update(u.id, { isActive: !u.isActive });
      load(false);
    } catch {
      /* non-critical */
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {users.length} kullanıcı · {activeCount} aktif
        </p>
      </div>

      <AdminDataTable
        headers={['Ad Soyad', 'E-posta', 'Telefon', 'Rol', 'Durum', 'Üyelik', 'İşlemler']}
        emptyMessage="Kayıtlı kullanıcı yok."
        rows={users.map((u) => [
          <span className="font-medium text-slate-900 dark:text-white">
            {u.firstName} {u.lastName}
          </span>,
          <span className="font-mono text-xs">{u.email}</span>,
          u.phone ? (
            <span className="font-mono text-xs">{u.phone}</span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
          <UserRoleBadge role={u.role} />,
          u.isActive ? (
            <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              Aktif
            </span>
          ) : (
            <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400">
              Askıya Alındı
            </span>
          ),
          formatDate(u.createdAt),
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => openEdit(u)} className={BTN_TABLE_ACTION}>
              Düzenle
            </button>
            <button
              type="button"
              disabled={togglingId === u.id}
              onClick={() => handleToggleActive(u)}
              className={u.isActive ? BTN_DANGER : BTN_TABLE_ACTION}
            >
              {togglingId === u.id ? '…' : u.isActive ? 'Askıya Al' : 'Aktif Et'}
            </button>
          </div>,
        ])}
      />

      {/* ── Edit drawer ── */}
      <SlideOver
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Kullanıcı Düzenle"
        description={editingUser ? editingUser.email : ''}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setDrawerOpen(false)} className={BTN_GHOST}>
              İptal
            </button>
            <button form="user-form" type="submit" disabled={saving} className={BTN_PRIMARY}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Ad">
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
            <FormField label="Soyad">
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={INPUT_CLS}
              />
            </FormField>
          </div>

          <FormField label="Telefon">
            <input
              type="tel"
              placeholder="+90 555 000 00 00"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={INPUT_CLS}
            />
          </FormField>

          {editingUser && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
              <p className="text-xs text-slate-500">
                <span className="font-semibold">E-posta</span> ve{' '}
                <span className="font-semibold">rol</span> değişiklikleri bu panelden yapılamaz.
                Rol için Supabase üzerinden çalışan kaydını düzenleyin.
              </p>
            </div>
          )}

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
