import React, { useState } from 'react';

// ============================================================================
// TYPESCRIPT INTERFACES (SQL Şeması ile %100 Uyumlu)
// ============================================================================

interface Station {
  station_id: number;
  station_name: string;
  operator_name: string;
  city: string;
  is_active: boolean;
  total_revenue_tl: number; // vw_station_revenue'den gelir
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

// ============================================================================
// MOCK DATA (SQL DOSYANDAKİ INSERT KOMUTLARINDAN ALINMIŞTIR)
// ============================================================================

const mockStations: Station[] = [
  { station_id: 1, station_name: 'Moda EV Hub', operator_name: 'ZES', city: 'Istanbul', is_active: true, total_revenue_tl: 1250.50 },
  { station_id: 2, station_name: 'Beşiktaş Süper Şarj', operator_name: 'Sharz.net', city: 'Istanbul', is_active: true, total_revenue_tl: 840.00 },
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stations' | 'chargers' | 'users'>('dashboard');

  // Dashboard İstatistik Hesaplamaları (SQL View Mantığı)
  const totalRevenue = mockStations.reduce((sum, st) => sum + st.total_revenue_tl, 0);
  const faultyChargersCount = mockChargers.filter(c => c.status === 'FAULT').length;
  const activeSessionsCount = mockChargers.filter(c => c.status === 'IN_USE').length;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #1e293b' }}>
          <h1 style={{ color: '#38bdf8', fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>VoltOps</h1>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Network Admin Panel</span>
        </div>
        
        <nav style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <MenuButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="📊" text="Genel Bakış" />
          <MenuButton active={activeTab === 'stations'} onClick={() => setActiveTab('stations')} icon="📍" text="İstasyonlar" />
          <MenuButton active={activeTab === 'chargers'} onClick={() => setActiveTab('chargers')} icon="⚡" text="Cihaz Durumları" />
          <MenuButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon="👥" text="Kullanıcı Yönetimi" />
        </nav>

        <div style={{ padding: '20px', backgroundColor: '#1e293b', borderTop: '1px solid #334155' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Batuhan Gürsoy</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>System Administrator</div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HEADER */}
        <header style={{ backgroundColor: 'white', padding: '20px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px', fontWeight: '600' }}>
            {activeTab === 'dashboard' && 'Ağ Genel Durumu'}
            {activeTab === 'stations' && 'İstasyon ve Operatör Yönetimi'}
            {activeTab === 'chargers' && 'Şarj Cihazı Arıza ve Durum Takibi'}
            {activeTab === 'users' && 'Sistem Kullanıcıları ve Bakiyeler'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {faultyChargersCount > 0 && (
              <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                🚨 {faultyChargersCount} Cihaz Arızalı
              </span>
            )}
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <StatCard title="Toplam İstasyon" value={mockStations.length.toString()} icon="📍" color="#3b82f6" />
              <StatCard title="Aktif Şarj İşlemi" value={activeSessionsCount.toString()} icon="🔋" color="#10b981" />
              <StatCard title="Arızalı (FAULT) Cihaz" value={faultyChargersCount.toString()} icon="⚠️" color="#ef4444" />
              <StatCard title="Toplam Gelir (Ödenmiş)" value={`₺${totalRevenue.toLocaleString('tr-TR')}`} icon="💰" color="#f59e0b" />
            </div>
          )}

          {/* TAB: STATIONS */}
          {activeTab === 'stations' && (
            <DataTable 
              headers={['ID', 'İstasyon Adı', 'Operatör', 'Şehir', 'Durum', 'Toplam Gelir']}
              rows={mockStations.map(s => [
                `#${s.station_id}`,
                s.station_name,
                <Badge text={s.operator_name} color="blue" />,
                s.city,
                <Badge text={s.is_active ? 'AKTİF' : 'PASİF'} color={s.is_active ? 'green' : 'gray'} />,
                `₺${s.total_revenue_tl.toFixed(2)}`
              ])}
            />
          )}

          {/* TAB: CHARGERS */}
          {activeTab === 'chargers' && (
            <DataTable 
              headers={['ID', 'Seri No', 'İstasyon', 'Tip', 'Güç', 'Durum']}
              rows={mockChargers.map(c => [
                `#${c.charger_id}`,
                c.serial_number,
                c.station_name,
                c.connector_type,
                `${c.max_power_kw} kW`,
                <Badge 
                  text={c.status} 
                  color={c.status === 'AVAILABLE' ? 'green' : c.status === 'IN_USE' ? 'blue' : c.status === 'FAULT' ? 'red' : 'gray'} 
                />
              ])}
            />
          )}

          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <DataTable 
              headers={['ID', 'Ad Soyad', 'E-Posta', 'Telefon', 'Mevcut Bakiye']}
              rows={mockUsers.map(u => [
                `#${u.user_id}`,
                u.full_name,
                u.email,
                u.phone,
                <strong style={{ color: u.balance_tl > 50 ? '#15803d' : '#b91c1c' }}>₺{u.balance_tl.toFixed(2)}</strong>
              ])}
            />
          )}

        </div>
      </main>
    </div>
  );
}

// ============================================================================
// UI BİLEŞENLERİ (COMPONENTS)
// ============================================================================

const MenuButton = ({ active, onClick, icon, text }: { active: boolean, onClick: () => void, icon: string, text: string }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 16px',
      backgroundColor: active ? '#38bdf8' : 'transparent',
      color: active ? '#0f172a' : '#cbd5e1',
      border: 'none', borderRadius: '8px', cursor: 'pointer',
      fontSize: '15px', fontWeight: active ? '600' : '400', transition: 'all 0.2s', textAlign: 'left'
    }}
  >
    <span style={{ fontSize: '18px' }}>{icon}</span> {text}
  </button>
);

const StatCard = ({ title, value, icon, color }: { title: string, value: string, icon: string, color: string }) => (
  <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderTop: `4px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>{title}</h3>
        <p style={{ margin: '12px 0 0 0', fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>{value}</p>
      </div>
      <div style={{ fontSize: '28px', backgroundColor: `${color}15`, padding: '12px', borderRadius: '12px' }}>
        {icon}
      </div>
    </div>
  </div>
);

const DataTable = ({ headers, rows }: { headers: string[], rows: React.ReactNode[][] }) => (
  <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '600', color: '#475569', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '16px 24px', fontSize: '14px', color: '#1e293b' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Badge = ({ text, color }: { text: string, color: 'green' | 'red' | 'blue' | 'gray' }) => {
  const colors = {
    green: { bg: '#dcfce7', text: '#166534' },
    red: { bg: '#fee2e2', text: '#991b1b' },
    blue: { bg: '#dbeafe', text: '#1e40af' },
    gray: { bg: '#f1f5f9', text: '#475569' }
  };
  return (
    <span style={{ backgroundColor: colors[color].bg, color: colors[color].text, padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
      {text}
    </span>
  );
};