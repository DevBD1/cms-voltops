import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout, type CustomerTab } from '../../components/Layout/AppLayout';
import { clearSession, getSession } from '../../lib/auth';
import { HistoryView } from './views/HistoryView';
import { HomeView } from './views/HomeView';
import { InvoicesView } from './views/InvoicesView';
import { StationsView } from './views/StationsView';
import { SupportView } from './views/SupportView';

export default function CustomerApp() {
  const navigate = useNavigate();
  const [session] = useState(getSession);
  const [tab, setTab] = useState<CustomerTab>('home');

  const userName = session
    ? `${session.user.firstName} ${session.user.lastName}`
    : (session as any)?.email ?? 'Kullanıcı';

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const handleHomeNavigate = (next: 'history' | 'stations') => {
    setTab(next);
  };

  return (
    <AppLayout activeTab={tab} onTabChange={setTab} userName={userName} onLogout={handleLogout}>
      {tab === 'home' && <HomeView onNavigate={handleHomeNavigate} />}
      {tab === 'history' && <HistoryView />}
      {tab === 'invoices' && <InvoicesView />}
      {tab === 'stations' && <StationsView />}
      {tab === 'support' && <SupportView />}
    </AppLayout>
  );
}
