import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import { StationStatusBadge } from '../../../components/customer/StatusBadge';
import { stationsApi } from '../../../lib/api';
import type { Station } from '../../../types/db.types';

export function StationsView() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    stationsApi
      .list()
      .then(setStations)
      .catch(() => setError('İstasyonlar yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  return (
    <AdminDataTable
      headers={['Kod', 'İstasyon Adı', 'Şehir / İlçe', 'Durum', 'Soket', 'Arızalı']}
      emptyMessage="Henüz istasyon eklenmemiş."
      rows={stations.map((s) => [
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{s.stationCode}</span>,
        <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>,
        `${s.city}${s.district ? ` / ${s.district}` : ''}`,
        <StationStatusBadge status={s.status} />,
        <span className="font-mono text-sm">{s.totalPlugs}</span>,
        s.faultyPlugs > 0 ? (
          <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
            {s.faultyPlugs}
          </span>
        ) : (
          <span className="font-mono text-sm text-slate-400">0</span>
        ),
      ])}
    />
  );
}
