import { useAuth } from '../context/AuthContext';
import { AdminTickets } from './tickets/AdminTickets';
import { MyTickets } from './tickets/MyTickets';

export function Tickets() {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminTickets /> : <MyTickets />;
}
