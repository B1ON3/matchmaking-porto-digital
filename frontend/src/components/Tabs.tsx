import { useRef, type KeyboardEvent } from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  const listaRef = useRef<HTMLDivElement>(null);

  function focar(indice: number) {
    const botoes = listaRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');

    botoes?.[indice]?.focus();
  }

  function aoTeclar(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
    const ultimo = tabs.length - 1;
    let destino: number | null = null;

    if (evento.key === 'ArrowRight') {
      destino = indice === ultimo ? 0 : indice + 1;
    } else if (evento.key === 'ArrowLeft') {
      destino = indice === 0 ? ultimo : indice - 1;
    } else if (evento.key === 'Home') {
      destino = 0;
    } else if (evento.key === 'End') {
      destino = ultimo;
    }

    if (destino === null) {
      return;
    }

    evento.preventDefault();
    onChange(tabs[destino].id);
    focar(destino);
  }

  return (
    <div
      ref={listaRef}
      role="tablist"
      aria-label="Seções"
      className="flex gap-1 overflow-x-auto rounded-full bg-slate-100 p-1 dark:bg-noite-800"
    >
      {tabs.map((tab, indice) => {
        const selecionada = tab.id === active;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selecionada}
            tabIndex={selecionada ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(evento) => aoTeclar(evento, indice)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              selecionada
                ? 'bg-white text-laco-900 shadow-sm dark:bg-noite-700 dark:text-areia-100'
                : 'text-slate-600 hover:text-laco-800 dark:text-slate-300 dark:hover:text-areia-100'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
