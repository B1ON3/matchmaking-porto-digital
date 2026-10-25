import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './dashboard/AdminDashboard';
import { InvestorDashboard } from './dashboard/InvestorDashboard';
import { StartupDashboard } from './dashboard/StartupDashboard';

export function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (user?.role === 'STARTUP') {
    return <StartupDashboard />;
  }

  return <InvestorDashboard />;
}
