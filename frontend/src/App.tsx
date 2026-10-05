import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Spinner } from './components/Spinner';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Matchmaking } from './pages/Matchmaking';
import { Messages } from './pages/Messages';
import { Appointments } from './pages/Appointments';
import { Moderation } from './pages/Moderation';

function Protegida({ children, apenasAdmin = false }: { children: ReactElement; apenasAdmin?: boolean }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <Spinner texto="Verificando sua sessão..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // a tela de moderação só existe pra admin (RNF10)
  if (apenasAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen">
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
          <Protegida>
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
          <Protegida apenasAdmin>
            <Moderation />
          </Protegida>
        }
      />

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}