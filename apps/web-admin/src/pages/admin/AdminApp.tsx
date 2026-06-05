import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AdminLayout,
  getAdminPageTitle,
  type AdminTab,
} from '../../components/Layout/AdminLayout';
import { clearSession, getSession } from '../../lib/auth';
import { formatRole } from '../../lib/formatters';
import { plugsApi } from '../../lib/api';
import { OverviewView } from './views/OverviewView';
import { StationsView } from './views/StationsView';
import { DevicesView } from './views/DevicesView';
import { EmployeesView } from './views/EmployeesView';
import { MaintenanceView } from './views/MaintenanceView';
import { SupportView } from './views/SupportView';
import { UsersView } from './views/UsersView';

export default function AdminApp() {
  const navigate = useNavigate();
  const [session] = useState(getSession);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [faultyPlugCount, setFaultyPlugCount] = useState(0);

  const userLabel = session
    ? `${session.user.firstName} ${session.user.lastName}`
    : 'Kullanıcı';
  const roleLabel = session ? formatRole(session.user.role) : '';

  useEffect(() => {
    plugsApi
      .list()
      .then((plugs) => setFaultyPlugCount(plugs.filter((p) => p.status === 'FAULTY').length))
      .catch(() => {
        /* non-critical — badge just stays at 0 */
      });
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate('/login/admin', { replace: true });
  };

  return (
    <AdminLayout
      activeTab={tab}
      onTabChange={setTab}
      pageTitle={getAdminPageTitle(tab)}
      userLabel={userLabel}
      roleLabel={roleLabel}
      alertCount={faultyPlugCount}
      onLogout={handleLogout}
    >
      {tab === 'overview' && <OverviewView />}
      {tab === 'stations' && <StationsView />}
      {tab === 'devices' && <DevicesView />}
      {tab === 'maintenance' && <MaintenanceView />}
      {tab === 'support' && <SupportView />}
      {tab === 'users' && <UsersView />}
      {tab === 'employees' && <EmployeesView />}
    </AdminLayout>
  );
}
