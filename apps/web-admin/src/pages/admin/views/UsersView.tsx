import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import { UserRoleBadge } from '../../../components/customer/StatusBadge';
import { usersApi } from '../../../lib/api';
import { formatDate, formatRole } from '../../../lib/formatters';
import type { User } from '../../../types/db.types';

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    usersApi
      .list()
      .then(setUsers)
      .catch(() => setError('Kullanıcılar yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <AdminDataTable
      headers={['Ad Soyad', 'E-posta', 'Telefon', 'Rol', 'Üyelik']}
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
        formatDate(u.createdAt),
      ])}
    />
  );
}
