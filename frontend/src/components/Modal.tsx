import { useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useDialogBehavior } from './useDialogBehavior';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
}

const TAMANHOS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ open, onClose, title, children, footer, size = 'lg' }: ModalProps) {
  const tituloId = useId();
  const painelRef = useDialogBehavior(open, onClose);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-noite-900/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
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
        className={`w-full ${TAMANHOS[size]} max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-laco outline-none dark:bg-noite-850 sm:rounded-3xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur dark:border-noite-700 dark:bg-noite-850/95">
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

        <div className="px-6 py-5">{children}</div>

        {footer ? (
          <div className="sticky bottom-0 border-t border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur dark:border-noite-700 dark:bg-noite-850/95">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
