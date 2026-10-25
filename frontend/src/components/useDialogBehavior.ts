import { useEffect, useRef } from 'react';

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogBehavior(open: boolean, onClose: () => void) {
  const painelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      return;
    }

    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function focaveis(): HTMLElement[] {
      const painel = painelRef.current;

      if (!painel) {
        return [];
      }

      return Array.from(painel.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (elemento) => elemento.offsetParent !== null,
      );
    }

    const timer = window.setTimeout(() => {
      const primeiro = focaveis()[0];

      if (primeiro) {
        primeiro.focus();
      } else {
        painelRef.current?.focus();
      }
    }, 0);

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCloseRef.current();
        return;
      }

      if (evento.key !== 'Tab') {
        return;
      }

      const itens = focaveis();

      if (itens.length === 0) {
        evento.preventDefault();
        painelRef.current?.focus();
        return;
      }

      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus();
    };
  }, [open]);

  return painelRef;
}
