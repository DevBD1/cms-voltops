import { useEffect, useState } from 'react';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import { SocketStatusBadge } from '../../../components/customer/StatusBadge';
import { plugsApi } from '../../../lib/api';
import { formatPlugType, formatPowerKw } from '../../../lib/formatters';
import type { Plug } from '../../../types/db.types';

export function DevicesView() {
  const [plugs, setPlugs] = useState<Plug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    plugsApi
      .list()
      .then(setPlugs)
      .catch(() => setError('Soketler yüklenirken hata oluştu.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Yükleniyor…</p>;
  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  // Group by station for the devices section
  const byStation = plugs.reduce<Record<string, { name: string; plugs: Plug[] }>>(
    (acc, plug) => {
      if (!acc[plug.stationCode]) {
        acc[plug.stationCode] = { name: plug.stationName, plugs: [] };
      }
      acc[plug.stationCode].plugs.push(plug);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-8">
      {/* Station-grouped plug view */}
      {Object.entries(byStation).map(([code, { name, plugs: stPlugs }]) => (
        <section key={code}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{name}</h2>
            <span className="font-mono text-xs text-slate-400">{code}</span>
          </div>
          <AdminDataTable
            headers={['Soket Kodu', 'Tip', 'Güç', 'Akım', 'Durum']}
            rows={stPlugs.map((p) => [
              <span className="font-mono text-xs">{p.plugCode}</span>,
              formatPlugType(p.plugType),
              <span className="font-mono text-sm">{formatPowerKw(p.powerKw)}</span>,
              <span className="font-mono text-xs text-slate-500">{p.currentType}</span>,
              <SocketStatusBadge status={p.status} />,
            ])}
          />
        </section>
      ))}

      {plugs.length === 0 && (
        <p className="text-sm text-slate-500">Henüz soket eklenmemiş.</p>
      )}
    </div>
  );
}
