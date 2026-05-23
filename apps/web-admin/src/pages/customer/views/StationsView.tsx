import { StationStatusBadge } from '../../../components/customer/StatusBadge';
import { countAvailableSockets, getActiveStations } from '../../../lib/customer-data';

export function StationsView() {
  const stations = getActiveStations();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">İstasyonlar</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Aktif istasyonlar ve müsait soket sayıları
        </p>
      </section>

      <ul className="space-y-4">
        {stations.map((station) => {
          const availableCount = countAvailableSockets(station);
          return (
            <li
              key={station.id}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111111]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 dark:text-white">{station.name}</h2>
                  <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{station.code}</p>
                </div>
                <StationStatusBadge status={station.status} />
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                {station.district}, {station.city}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{station.address}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Müsait soket</span>
                <span
                  className={`font-mono text-sm font-semibold ${
                    availableCount > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {availableCount}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
