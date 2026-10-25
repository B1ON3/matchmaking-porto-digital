import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAgenda } from '../context/AgendaContext';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import type { UserRole } from '../types';

const ROTULOS: Record<UserRole, string> = {
  STARTUP: 'Startup',
  INVESTOR: 'Investidor',
  MENTOR: 'Mentor',
  ADMIN: 'Administrador',
};

export function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const { open: abrirAgenda, upcomingCount } = useAgenda();
  const temPerfil = hasRole('STARTUP', 'INVESTOR', 'MENTOR');
  const ehAdmin = hasRole('ADMIN');

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/matchmaking', label: 'Matchmaking' },
    ...(temPerfil ? [{ to: '/perfil', label: 'Meu perfil' }] : []),
    { to: '/mensagens', label: 'Mensagens' },
    ...(ehAdmin ? [{ to: '/moderacao', label: 'Moderação' }] : []),
  ];

  function classeLink({ isActive }: { isActive: boolean }) {
    return `shrink-0 rounded-full px-3.5 py-2 text-sm transition ${
      isActive
        ? 'bg-laco-100 font-semibold text-laco-900 dark:bg-laco-900/60 dark:text-areia-100'
        : 'text-slate-600 hover:bg-white hover:text-laco-800 dark:text-slate-300 dark:hover:bg-noite-800 dark:hover:text-areia-100'
    }`;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-areia-50/85 backdrop-blur dark:border-noite-700 dark:bg-noite-900/85">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/dashboard" aria-label="Laço — início">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={classeLink}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => abrirAgenda()}
            className="btn-secondary relative px-3 py-1.5 sm:px-4 sm:py-2"
            aria-label={`Abrir agenda${upcomingCount > 0 ? ` (${upcomingCount} próximos)` : ''}`}
          >
            Agenda
            {upcomingCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-barro-600 px-1 text-[10px] font-bold leading-[18px] text-white">
                {upcomingCount > 9 ? '9+' : upcomingCount}
              </span>
            ) : null}
          </button>

          <ThemeToggle />

          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role ? ROTULOS[user.role] : ''}</p>
          </div>

          <button type="button" onClick={logout} className="btn-secondary px-3 py-1.5 sm:px-4 sm:py-2">
            Sair
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-3 pb-2 dark:border-noite-700 md:hidden">
        <nav className="flex items-center gap-1 overflow-x-auto pt-2">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={classeLink}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
