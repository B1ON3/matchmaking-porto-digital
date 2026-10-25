import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogBehavior } from './useDialogBehavior';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  const tituloId = useId();
  const painelRef = useDialogBehavior(open, onClose);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-noite-900/70 backdrop-blur-sm"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-laco outline-none dark:bg-noite-850"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 dark:border-noite-700">
          <h2 id={tituloId} className="font-display text-xl font-semibold text-slate-900 dark:text-areia-100">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-laco-300 hover:text-laco-800 dark:border-noite-700 dark:text-slate-300 dark:hover:border-laco-700 dark:hover:text-areia-100"
          >
            Fechar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? <div className="border-t border-slate-200/80 px-5 py-4 dark:border-noite-700">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
