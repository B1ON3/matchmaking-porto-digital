import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/matchmaking', label: 'Matchmaking' },
  { to: '/perfil', label: 'Meu perfil' },
  { to: '/mensagens', label: 'Mensagens' },
  { to: '/agendamentos', label: 'Agendamentos' },
];

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-porto-600 font-bold text-white">
            P
          </span>
          <span className="font-semibold text-slate-900">
            Matchmaking <span className="text-porto-600">Porto Digital</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-porto-50 font-medium text-porto-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/moderacao"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-porto-50 font-medium text-porto-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              Moderação
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button type="button" onClick={logout} className="btn-secondary">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}