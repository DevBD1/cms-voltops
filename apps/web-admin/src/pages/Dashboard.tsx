import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { clearSession, getSession } from '../lib/auth';

// ============================================================================
// TYPESCRIPT INTERFACES (SQL Şeması ile %100 Uyumlu)
// ============================================================================

interface Station {
  station_id: number;
  station_name: string;
  operator_name: string;
  city: string;
  is_active: boolean;
  total_revenue_tl: number;
}

interface Charger {
  charger_id: number;
  serial_number: string;
  status: 'AVAILABLE' | 'IN_USE' | 'FAULT' | 'OFFLINE';
  connector_type: string;
  max_power_kw: number;
  station_name: string;
}

interface User {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  balance_tl: number;
}

const mockStations: Station[] = [
  { station_id: 1, station_name: 'Moda EV Hub', operator_name: 'ZES', city: 'Istanbul', is_active: true, total_revenue_tl: 1250.5 },
  { station_id: 2, station_name: 'Beşiktaş Süper Şarj', operator_name: 'Sharz.net', city: 'Istanbul', is_active: true, total_revenue_tl: 840.0 },
  { station_id: 3, station_name: 'Çankaya Charge Park', operator_name: 'ZES', city: 'Ankara', is_active: true, total_revenue_tl: 430.75 },
];

const mockChargers: Charger[] = [
  { charger_id: 1, serial_number: 'ZES-001-T2', status: 'AVAILABLE', connector_type: 'TYPE2', max_power_kw: 22.0, station_name: 'Moda EV Hub' },
  { charger_id: 2, serial_number: 'ZES-002-CCS', status: 'IN_USE', connector_type: 'CCS2', max_power_kw: 150.0, station_name: 'Moda EV Hub' },
  { charger_id: 3, serial_number: 'SHZ-010-CCS', status: 'AVAILABLE', connector_type: 'CCS2', max_power_kw: 150.0, station_name: 'Beşiktaş Süper Şarj' },
  { charger_id: 4, serial_number: 'SHZ-011-CHD', status: 'FAULT', connector_type: 'CHADEMO', max_power_kw: 50.0, station_name: 'Beşiktaş Süper Şarj' },
  { charger_id: 5, serial_number: 'ZES-030-T2', status: 'AVAILABLE', connector_type: 'TYPE2', max_power_kw: 22.0, station_name: 'Çankaya Charge Park' },
];

const mockUsers: User[] = [
  { user_id: 1, full_name: 'Mehmet Burak', email: 'mehmet@example.com', phone: '+905551234567', balance_tl: 250.0 },
  { user_id: 2, full_name: 'Ayşe Kaya', email: 'ayse@example.com', phone: '+905559876543', balance_tl: 80.0 },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stations' | 'chargers' | 'users'>('dashboard');
  const navigate = useNavigate();
  const session = getSession();

  const totalRevenue = mockStations.reduce((sum, st) => sum + st.total_revenue_tl, 0);
  const faultyChargersCount = mockChargers.filter((c) => c.status === 'FAULT').length;
  const activeSessionsCount = mockChargers.filter((c) => c.status === 'IN_USE').length;

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans dark:bg-slate-950">
      <aside className="flex w-64 flex-col bg-slate-900 text-slate-200">
        <div className="border-b border-slate-800 p-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-sky-400">VoltOps</h1>
          <span className="text-xs text-slate-500">Network Admin Panel</span>
        </div>

        <nav className="flex flex-1 flex-col gap-2 p-4">
          <MenuButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="📊" text="Genel Bakış" />
          <MenuButton active={activeTab === 'stations'} onClick={() => setActiveTab('stations')} icon="📍" text="İstasyonlar" />
          <MenuButton active={activeTab === 'chargers'} onClick={() => setActiveTab('chargers')} icon="⚡" text="Cihaz Durumları" />
          <MenuButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="👥" text="Kullanıcı Yönetimi" />
        </nav>

        <div className="border-t border-slate-700 bg-slate-800 p-5">
          <div className="text-sm font-bold">{session?.email ?? 'Admin'}</div>
          <div className="text-xs text-slate-400">System Administrator</div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-md border border-slate-600 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {activeTab === 'dashboard' && 'Ağ Genel Durumu'}
            {activeTab === 'stations' && 'İstasyon ve Operatör Yönetimi'}
            {activeTab === 'chargers' && 'Şarj Cihazı Arıza ve Durum Takibi'}
            {activeTab === 'users' && 'Sistem Kullanıcıları ve Bakiyeler'}
          </h2>
          <div className="flex items-center gap-4">
            {faultyChargersCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1.5 text-sm font-bold text-red-700 dark:bg-red-950 dark:text-red-400">
                🚨 {faultyChargersCount} Cihaz Arızalı
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
              <StatCard title="Toplam İstasyon" value={mockStations.length.toString()} icon="📍" color="#3b82f6" />
              <StatCard title="Aktif Şarj İşlemi" value={activeSessionsCount.toString()} icon="🔋" color="#10b981" />
              <StatCard title="Arızalı (FAULT) Cihaz" value={faultyChargersCount.toString()} icon="⚠️" color="#ef4444" />
              <StatCard title="Toplam Gelir (Ödenmiş)" value={`₺${totalRevenue.toLocaleString('tr-TR')}`} icon="💰" color="#f59e0b" />
            </div>
          )}

          {activeTab === 'stations' && (
            <DataTable
              headers={['ID', 'İstasyon Adı', 'Operatör', 'Şehir', 'Durum', 'Toplam Gelir']}
              rows={mockStations.map((s) => [
                `#${s.station_id}`,
                s.station_name,
                <Badge text={s.operator_name} color="blue" />,
                s.city,
                <Badge text={s.is_active ? 'AKTİF' : 'PASİF'} color={s.is_active ? 'green' : 'gray'} />,
                `₺${s.total_revenue_tl.toFixed(2)}`,
              ])}
            />
          )}

          {activeTab === 'chargers' && (
            <DataTable
              headers={['ID', 'Seri No', 'İstasyon', 'Tip', 'Güç', 'Durum']}
              rows={mockChargers.map((c) => [
                `#${c.charger_id}`,
                <span className="font-mono text-sm">{c.serial_number}</span>,
                c.station_name,
                c.connector_type,
                `${c.max_power_kw} kW`,
                <Badge
                  text={c.status}
                  color={
                    c.status === 'AVAILABLE' ? 'green' : c.status === 'IN_USE' ? 'blue' : c.status === 'FAULT' ? 'red' : 'gray'
                  }
                />,
              ])}
            />
          )}

          {activeTab === 'users' && (
            <DataTable
              headers={['ID', 'Ad Soyad', 'E-Posta', 'Telefon', 'Mevcut Bakiye']}
              rows={mockUsers.map((u) => [
                `#${u.user_id}`,
                u.full_name,
                u.email,
                u.phone,
                <strong className={u.balance_tl > 50 ? 'text-emerald-700' : 'text-red-700'}>₺{u.balance_tl.toFixed(2)}</strong>,
              ])}
            />
          )}
        </div>
      </main>
    </div>
  );
}

const MenuButton = ({
  active,
  onClick,
  icon,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  text: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-[15px] transition-all ${
      active ? 'bg-sky-400 font-semibold text-slate-900' : 'font-normal text-slate-300 hover:bg-slate-800'
    }`}
  >
    <span className="text-lg">{icon}</span> {text}
  </button>
);

const StatCard = ({ title, value, icon, color }: { title: string; value: string; icon: string; color: string }) => (
  <div className="rounded-2xl border-t-4 bg-white p-6 shadow-sm dark:bg-slate-900" style={{ borderTopColor: color }}>
    <div className="flex items-start justify-between">
      <div>
        <h3 className="m-0 text-sm font-semibold uppercase text-slate-500">{title}</h3>
        <p className="mt-3 text-[32px] font-extrabold text-slate-900 dark:text-white">{value}</p>
      </div>
      <div className="rounded-xl p-3 text-[28px]" style={{ backgroundColor: `${color}15` }}>
        {icon}
      </div>
    </div>
  </div>
);

const DataTable = ({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) => (
  <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-slate-900">
    <table className="w-full border-collapse text-left">
      <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-6 py-4 text-xs font-semibold uppercase text-slate-500">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
            {row.map((cell, j) => (
              <td key={j} className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Badge = ({ text, color }: { text: string; color: 'green' | 'red' | 'blue' | 'gray' }) => {
  const colors = {
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400',
    gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return <span className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide ${colors[color]}`}>{text}</span>;
};
