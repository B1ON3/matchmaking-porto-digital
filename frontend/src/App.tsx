import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Spinner } from './components/Spinner';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Matchmaking } from './pages/Matchmaking';
import { Messages } from './pages/Messages';
import { Appointments } from './pages/Appointments';
import { Moderation } from './pages/Moderation';
import type { UserRole } from './types';

function Protegida({ children, perfis }: { children: ReactElement; perfis?: UserRole[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner texto="Verificando sua sessão..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (perfis && !perfis.includes(user.role)) {
    return <Navigate to={user.role === 'ADMIN' ? '/moderacao' : '/dashboard'} replace />;
  }

  return (
    <div className="min-h-screen bg-areia-50 dark:bg-noite-900">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner texto="Carregando a plataforma..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />

      <Route
        path="/dashboard"
        element={
          <Protegida>
            <Dashboard />
          </Protegida>
        }
      />
      <Route
        path="/perfil"
        element={
          <Protegida perfis={['STARTUP', 'INVESTOR', 'MENTOR']}>
            <Profile />
          </Protegida>
        }
      />
      <Route
        path="/matchmaking"
        element={
          <Protegida>
            <Matchmaking />
          </Protegida>
        }
      />
      <Route
        path="/mensagens"
        element={
          <Protegida>
            <Messages />
          </Protegida>
        }
      />
      <Route
        path="/agendamentos"
        element={
          <Protegida>
            <Appointments />
          </Protegida>
        }
      />
      <Route
        path="/moderacao"
        element={
          <Protegida perfis={['ADMIN']}>
            <Moderation />
          </Protegida>
        }
      />

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}
