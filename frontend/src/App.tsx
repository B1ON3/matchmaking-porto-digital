import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { SiteFooter } from './components/SiteFooter';
import { Spinner } from './components/Spinner';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Connections } from './pages/Connections';
import { Profile } from './pages/Profile';
import { Messages } from './pages/Messages';
import { Appointments } from './pages/Appointments';
import { Moderation } from './pages/Moderation';
import { Tickets } from './pages/Tickets';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { PrivacyCenter } from './pages/PrivacyCenter';
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
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-areia-50 dark:bg-noite-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
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
      <Route path="/privacidade" element={<PrivacyPolicy />} />

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
        path="/privacidade/conta"
        element={
          <Protegida>
            <PrivacyCenter />
          </Protegida>
        }
      />
      <Route
        path="/conexoes"
        element={
          <Protegida>
            <Connections />
          </Protegida>
        }
      />
      <Route path="/matchmaking" element={<Navigate to="/conexoes" replace />} />
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
        path="/chamados"
        element={
          <Protegida>
            <Tickets />
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
