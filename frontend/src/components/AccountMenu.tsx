import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAgenda } from '../context/AgendaContext';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import type { TrustStatus, UserRole } from '../types';

const ROTULOS: Record<UserRole, string> = {
  STARTUP: 'Startup',
  INVESTOR: 'Investidor',
  MENTOR: 'Mentor',
  ADMIN: 'Administrador',
};

const CONFIANCA: Record<TrustStatus, { label: string; classe: string }> = {
  NAO_AVALIADO: {
    label: 'Ainda não avaliado',
    classe: 'bg-slate-100 text-slate-600 dark:bg-noite-700 dark:text-slate-300',
  },
  CONFIAVEL: {
    label: 'Perfil confiável',
    classe: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  SUSPEITO: {
    label: 'Em revisão',
    classe: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  GOLPE: {
    label: 'Denúncia confirmada',
    classe: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  },
};

export function AccountMenu() {
  const { user, logout, isAdmin } = useAuth();
  const { open: abrirAgenda } = useAgenda();
  const [aberto, setAberto] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    function aoClicarFora(evento: MouseEvent) {
      if (!containerRef.current?.contains(evento.target as Node)) {
        setAberto(false);
      }
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        setAberto(false);
      }
    }

    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  if (!user) {
    return null;
  }

  const confianca = CONFIANCA[user.trustStatus ?? 'NAO_AVALIADO'];

  function fechar() {
    setAberto(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-transparent px-1.5 py-1 text-left transition hover:border-slate-200 hover:bg-white dark:hover:border-noite-700 dark:hover:bg-noite-800 sm:pr-3"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={menuId}
        onClick={() => setAberto((valor) => !valor)}
      >
        <Avatar name={user.name} size={34} />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[12rem] truncate text-sm font-semibold text-slate-900 dark:text-areia-100">
            {user.name}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{ROTULOS[user.role]}</span>
        </span>
        <span aria-hidden="true" className="hidden text-xs text-slate-400 sm:block">
          ▾
        </span>
      </button>

      {aberto ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Minha conta"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-laco dark:border-noite-700 dark:bg-noite-850"
        >
          <div className="border-b border-slate-100 px-4 py-4 dark:border-noite-700">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Minha conta</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-areia-100">{user.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="badge bg-areia-100 text-laco-900 dark:bg-noite-700 dark:text-areia-100">
                {ROTULOS[user.role]}
              </span>
              {!isAdmin ? <span className={`badge ${confianca.classe}`}>{confianca.label}</span> : null}
            </div>
          </div>

          <nav className="p-2" aria-label="Atalhos da conta">
            {!isAdmin ? (
              <Link
                to="/perfil"
                role="menuitem"
                onClick={fechar}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-noite-800"
              >
                <span>Meu perfil</span>
                <span aria-hidden="true" className="text-slate-400">
                  →
                </span>
              </Link>
            ) : null}

            <Link
              to="/chamados"
              role="menuitem"
              onClick={fechar}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-noite-800"
            >
              <span>{isAdmin ? 'Chamados' : 'Meus chamados'}</span>
              <span aria-hidden="true" className="text-slate-400">
                →
              </span>
            </Link>

            {!isAdmin ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  fechar();
                  abrirAgenda();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-noite-800"
              >
                <span>Minha agenda</span>
                <span aria-hidden="true" className="text-slate-400">
                  →
                </span>
              </button>
            ) : null}

            <Link
              to="/privacidade/conta"
              role="menuitem"
              onClick={fechar}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-noite-800"
            >
              <span>Privacidade e consentimentos</span>
              <span aria-hidden="true" className="text-slate-400">
                →
              </span>
            </Link>

            <Link
              to="/privacidade/conta#meus-dados"
              role="menuitem"
              onClick={fechar}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-noite-800"
            >
              <span>Meus dados</span>
              <span aria-hidden="true" className="text-slate-400">
                →
              </span>
            </Link>

            {isAdmin ? (
              <Link
                to="/moderacao"
                role="menuitem"
                onClick={fechar}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-noite-800"
              >
                <span>Sala de Controle</span>
                <span aria-hidden="true" className="text-slate-400">
                  →
                </span>
              </Link>
            ) : null}
          </nav>

          <div className="border-t border-slate-100 p-2 dark:border-noite-700">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                fechar();
                logout();
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
            >
              Sair da conta
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
