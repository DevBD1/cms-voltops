import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import { MaintenanceStatusBadge } from '../../../components/customer/StatusBadge';
import { maintenanceApi } from '../../../lib/api';
import { formatDate } from '../../../lib/formatters';
import type { MaintenanceRecord } from '../../../types/db.types';

export function MaintenanceView() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    maintenanceApi
      .list()
      .then(setRecords)
      .catch(() => setError('Bakım kayıtları yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <AdminDataTable
      headers={['İstasyon', 'Soket', 'Teknisyen', 'Açıklama', 'Durum', 'Açılış', 'Çözüm']}
      emptyMessage="Kayıtlı bakım kaydı yok."
      rows={records.map((r) => [
        r.stationName ?? '—',
        r.plugCode ? (
          <span className="font-mono text-xs">{r.plugCode}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
        r.technicianName ?? '—',
        <span className="max-w-xs truncate text-slate-700 dark:text-slate-300">
          {r.description}
        </span>,
        <MaintenanceStatusBadge status={r.status} />,
        formatDate(r.createdAt),
        r.completedDate ? formatDate(r.completedDate) : <span className="text-slate-400">—</span>,
      ])}
    />
  );
}
