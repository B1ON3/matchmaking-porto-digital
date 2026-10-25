import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  children: ReactNode;
  titulo: string;
  subtitulo: string;
  largura?: 'md' | '2xl';
}

export function AuthLayout({ children, titulo, subtitulo, largura = 'md' }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-areia-50 dark:bg-noite-900">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-6xl lg:grid-cols-[1.02fr_1fr]">
        <aside className="bg-renda relative hidden flex-col justify-between overflow-hidden bg-laco-950 px-12 py-12 text-areia-100 lg:flex">
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-barro-600/20 blur-3xl" />

          <Logo tom="claro" />

          <div className="relative max-w-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-areia-200/60">
              Economia criativa · Recife
            </p>
            <h2 className="mt-4 font-display text-[2.6rem] font-semibold leading-[1.06] text-areia-50">
              O laço entre quem cria e quem investe.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-areia-200/75">
              Startups do Porto Digital encontram capital, mentoria e parceiros num só lugar — com matchmaking por
              afinidade de setor, estágio, ticket e região.
            </p>
          </div>

          <div className="relative flex gap-10 border-t border-white/10 pt-6 text-sm">
            <div>
              <p className="font-display text-2xl font-semibold text-areia-50">4</p>
              <p className="mt-1 text-xs text-areia-200/60">dimensões de afinidade</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-areia-50">1:1</p>
              <p className="mt-1 text-xs text-areia-200/60">conversa direta</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-areia-50">LGPD</p>
              <p className="mt-1 text-xs text-areia-200/60">dados sob controle</p>
            </div>
          </div>
        </aside>

        <main className="flex items-center justify-center px-5 py-14 sm:px-10">
          <div className={`w-full ${largura === '2xl' ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="mb-8 lg:hidden">
              <Logo />
            </div>

            <div className="mb-7">
              <p className="eyebrow">Laço</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">{titulo}</h1>
              <p className="mt-2 text-sm text-slate-500">{subtitulo}</p>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
