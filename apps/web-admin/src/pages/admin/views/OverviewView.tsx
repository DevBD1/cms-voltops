import { useEffect, useState } from 'react';
import { KpiCard } from '../../../components/admin/KpiCard';
import { AdminDataTable } from '../../../components/admin/AdminDataTable';
import {
  SessionStatusBadge,
  TicketPriorityBadge,
  TicketStatusBadge,
} from '../../../components/customer/StatusBadge';
import { sessionsApi } from '../../../lib/api';
import { ticketsApi } from '../../../lib/api';
import { stationsApi } from '../../../lib/api';
import { plugsApi } from '../../../lib/api';
import { formatDateTime } from '../../../lib/formatters';
import type { Session, Ticket } from '../../../types/db.types';

function LoadError({ msg }: { msg: string }) {
  return <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>;
}

interface Kpis {
  stationCount: number;
  activeSessions: number;
  faultyPlugs: number;
  openMaintenance: number;
}

export function OverviewView() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      stationsApi.list(),
      plugsApi.list(),
      sessionsApi.list(),
      ticketsApi.list(),
    ])
      .then(([stations, plugs, sessions, tickets]) => {
        setKpis({
          stationCount: stations.length,
          activeSessions: sessions.filter((s) => s.status === 'ACTIVE').length,
          faultyPlugs: plugs.filter((p) => p.status === 'FAULTY').length,
          openMaintenance: tickets.filter((t) => t.status === 'OPEN').length,
        });
        setActiveSessions(sessions.filter((s) => s.status === 'ACTIVE'));
        setOpenTickets(tickets.filter((t) => t.status === 'OPEN'));
      })
      .catch(() => setError('Veriler yüklenirken hata oluştu.'));
  }, []);

  if (error) return <LoadError msg={error} />;
  if (!kpis) return <p className="text-sm text-slate-500">Yükleniyor…</p>;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Toplam İstasyon"
          value={kpis.stationCount}
          accent="brand"
          icon={<StationIcon />}
        />
        <KpiCard
          title="Aktif Şarj"
          value={kpis.activeSessions}
          accent="success"
          icon={<ChargingIcon />}
        />
        <KpiCard
          title="Arızalı Soket"
          value={kpis.faultyPlugs}
          accent="danger"
          icon={<FaultIcon />}
        />
        <KpiCard
          title="Açık Talepler"
          value={kpis.openMaintenance}
          accent="warning"
          icon={<TicketIcon />}
        />
      </section>

      {/* Active Sessions */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Aktif Şarj Seansları
        </h2>
        <AdminDataTable
          headers={['Kullanıcı', 'İstasyon', 'Soket', 'Başlangıç', 'Durum']}
          emptyMessage="Şu anda aktif seans yok."
          rows={activeSessions.map((s) => [
            s.userFullName,
            s.stationName,
            <span className="font-mono text-xs">{s.plugCode}</span>,
            formatDateTime(s.startedAt),
            <SessionStatusBadge status={s.status} />,
          ])}
        />
      </section>

      {/* Open Tickets */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Açık Destek Talepleri
        </h2>
        <AdminDataTable
          headers={['Kullanıcı', 'Konu', 'Öncelik', 'Durum', 'Tarih']}
          emptyMessage="Açık destek talebi yok."
          rows={openTickets.map((t) => [
            t.userFullName,
            t.title,
            <TicketPriorityBadge priority={t.priority} />,
            <TicketStatusBadge status={t.status} />,
            formatDateTime(t.createdAt),
          ])}
        />
      </section>
    </div>
  );
}

function StationIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function ChargingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
function FaultIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
function TicketIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}
