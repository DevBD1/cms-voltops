import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout, type CustomerTab } from '../../components/Layout/AppLayout';
import { clearSession, getSession } from '../../lib/auth';
import { MOCK_USERS } from '../../mocks/db.mocks';
import { HistoryView } from './views/HistoryView';
import { HomeView } from './views/HomeView';
import { InvoicesView } from './views/InvoicesView';
import { StationsView } from './views/StationsView';
import { SupportView } from './views/SupportView';

export default function CustomerApp() {
  const navigate = useNavigate();
  const session = getSession();
  const userId = session?.userId ?? '';
  const user = MOCK_USERS.find((u) => u.id === userId);
  const userName = user?.fullName ?? session?.email ?? 'Kullanıcı';

  const [tab, setTab] = useState<CustomerTab>('home');

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const handleHomeNavigate = (next: 'history' | 'stations') => {
    setTab(next);
  };

  return (
    <AppLayout activeTab={tab} onTabChange={setTab} userName={userName} onLogout={handleLogout}>
      {tab === 'home' && <HomeView userId={userId} onNavigate={handleHomeNavigate} />}
      {tab === 'history' && <HistoryView userId={userId} />}
      {tab === 'invoices' && <InvoicesView userId={userId} />}
      {tab === 'stations' && <StationsView />}
      {tab === 'support' && <SupportView userId={userId} />}
    </AppLayout>
  );
}
