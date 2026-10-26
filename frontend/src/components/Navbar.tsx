import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAgenda } from '../context/AgendaContext';
import { useUnread } from '../context/UnreadContext';
import { AccountMenu } from './AccountMenu';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface LinkDaBarra {
  to: string;
  label: string;
  badge?: number;
}

export function Navbar() {
  const { hasRole } = useAuth();
  const { open: abrirAgenda, upcomingCount } = useAgenda();
  const { unreadCount, ticketUnreadCount } = useUnread();
  const ehAdmin = hasRole('ADMIN');

  const inicio = ehAdmin ? { to: '/dashboard', label: 'Ecossistema' } : { to: '/dashboard', label: 'Meu painel' };

  const links: LinkDaBarra[] = ehAdmin
    ? [
        inicio,
        { to: '/chamados', label: 'Chamados', badge: ticketUnreadCount },
        { to: '/moderacao', label: 'Sala de Controle' },
      ]
    : [
        inicio,
        { to: '/conexoes', label: 'Conexões' },
        { to: '/mensagens', label: 'Conversas', badge: unreadCount },
        { to: '/chamados', label: 'Chamados', badge: ticketUnreadCount },
      ];

  function classeLink({ isActive }: { isActive: boolean }) {
    return `shrink-0 rounded-full px-3.5 py-2 text-sm transition ${
      isActive
        ? 'bg-laco-100 font-semibold text-laco-900 dark:bg-laco-900/60 dark:text-areia-100'
        : 'text-slate-600 hover:bg-white hover:text-laco-800 dark:text-slate-300 dark:hover:bg-noite-800 dark:hover:text-areia-100'
    }`;
  }

  function badge(valor?: number, rotulo = 'itens não lidos') {
    if (!valor) {
      return null;
    }

    return (
      <span
        className="ml-1.5 inline-flex min-w-[17px] items-center justify-center rounded-full bg-barro-600 px-1 text-[10px] font-bold leading-[17px] text-white"
        title={`${valor} ${rotulo}`}
      >
        {valor > 9 ? '9+' : valor}
      </span>
    );
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
              {link.to === '/mensagens' ? badge(link.badge, 'mensagens não lidas') : null}
              {link.to === '/chamados' ? badge(link.badge, 'chamados com novidades') : null}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!ehAdmin ? (
            <button
              type="button"
              onClick={() => abrirAgenda()}
              className="btn-secondary relative px-3 py-1.5 sm:px-4 sm:py-2"
              aria-label="Abrir agenda"
            >
              Agenda
              {upcomingCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-barro-600 px-1 text-[10px] font-bold leading-[18px] text-white">
                  {upcomingCount > 9 ? '9+' : upcomingCount}
                </span>
              ) : null}
            </button>
          ) : null}

          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>

      <div className="border-t border-slate-200/70 px-3 pb-2 dark:border-noite-700 md:hidden">
        <nav className="flex items-center gap-1 overflow-x-auto pt-2">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={classeLink}>
              {link.label}
              {link.to === '/mensagens' ? badge(link.badge, 'mensagens não lidas') : null}
              {link.to === '/chamados' ? badge(link.badge, 'chamados com novidades') : null}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
