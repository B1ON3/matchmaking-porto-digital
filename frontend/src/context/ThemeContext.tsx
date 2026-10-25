import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Tema = 'claro' | 'escuro';

interface ThemeContextValue {
  tema: Tema;
  alternarTema: () => void;
}

const CHAVE = 'laco:tema';

const ThemeContext = createContext<ThemeContextValue>({} as ThemeContextValue);

function temaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE);

  if (salvo === 'claro' || salvo === 'escuro') {
    return salvo;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

function aplicarTema(tema: Tema) {
  const escuro = tema === 'escuro';

  document.documentElement.classList.toggle('dark', escuro);
  document.documentElement.style.colorScheme = escuro ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  useEffect(() => {
    const midia = window.matchMedia('(prefers-color-scheme: dark)');

    function aoMudar(event: MediaQueryListEvent) {
      if (!localStorage.getItem(CHAVE)) {
        setTema(event.matches ? 'escuro' : 'claro');
      }
    }

    midia.addEventListener('change', aoMudar);

    return () => midia.removeEventListener('change', aoMudar);
  }, []);

  const alternarTema = useCallback(() => {
    setTema((atual) => {
      const proximo: Tema = atual === 'claro' ? 'escuro' : 'claro';

      localStorage.setItem(CHAVE, proximo);

      return proximo;
    });
  }, []);

  const valor = useMemo<ThemeContextValue>(() => ({ tema, alternarTema }), [tema, alternarTema]);

  return <ThemeContext.Provider value={valor}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const contexto = useContext(ThemeContext);

  if (!contexto) {
    throw new Error('useTheme precisa estar dentro do ThemeProvider');
  }

  return contexto;
}
