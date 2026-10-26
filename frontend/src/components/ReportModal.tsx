import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Alert } from './Alert';
import { Modal } from './Modal';
import { ticketService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { Ticket, TicketCategory } from '../types';

const CATEGORIAS_COM_ALVO: { id: TicketCategory; label: string }[] = [
  { id: 'GOLPE', label: 'Golpe ou fraude' },
  { id: 'PERFIL_FALSO', label: 'Perfil falso' },
  { id: 'ASSEDIO', label: 'Assédio ou conduta abusiva' },
  { id: 'SPAM', label: 'Spam ou abordagem insistente' },
  { id: 'DADOS_INCORRETOS', label: 'Dados incorretos no perfil' },
  { id: 'OUTRO', label: 'Outro problema' },
];

const CATEGORIAS_SUPORTE: { id: TicketCategory; label: string }[] = [
  { id: 'SUPORTE', label: 'Preciso de ajuda da equipe' },
  { id: 'OUTRO', label: 'Outro assunto' },
];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetUserId?: string;
  targetName?: string;
  onCreated?: (ticket: Ticket) => void;
}

export function ReportModal({ open, onClose, targetUserId, targetName, onCreated }: ReportModalProps) {
  const formId = useId();
  const comAlvo = Boolean(targetUserId);
  const categorias = useMemo(() => (comAlvo ? CATEGORIAS_COM_ALVO : CATEGORIAS_SUPORTE), [comAlvo]);

  const [categoria, setCategoria] = useState<TicketCategory>(categorias[0].id);
  const [assunto, setAssunto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [criado, setCriado] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCategoria(categorias[0].id);
    setAssunto(targetName ? `Denúncia sobre ${targetName}` : '');
    setDescricao('');
    setErro('');
    setCriado(null);
    setEnviando(false);
  }, [open, targetUserId, targetName, categorias]);

  function fechar() {
    if (enviando) {
      return;
    }

    onClose();
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      const ticket = await ticketService.create({
        categoria,
        assunto: assunto.trim(),
        descricao: descricao.trim(),
        ...(targetUserId ? { alvoId: targetUserId } : {}),
      });

      setCriado(ticket);
      onCreated?.(ticket);
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={criado ? 'Chamado registrado' : comAlvo ? 'Denunciar perfil' : 'Abrir um chamado'}
      size="md"
      footer={
        criado ? (
          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={onClose}>
              Entendi
            </button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary" onClick={fechar} disabled={enviando}>
              Cancelar
            </button>
            <button
              type="submit"
              form={formId}
              className="btn-primary"
              disabled={enviando || assunto.trim().length < 5 || descricao.trim().length < 20}
            >
              {enviando ? 'Enviando...' : comAlvo ? 'Registrar denúncia' : 'Abrir chamado'}
            </button>
          </div>
        )
      }
    >
      {criado ? (
        <div className="space-y-4">
          <Alert
            tipo="sucesso"
            mensagem="A administração recebeu seu chamado. A conversa fica disponível em Chamados."
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-noite-700 dark:bg-noite-900/60">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Protocolo
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-areia-100">{criado.protocol}</p>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              {comAlvo && targetName
                ? `A denúncia sobre ${targetName} será analisada pela equipe.`
                : 'A equipe responde por aqui e você recebe um aviso quando houver novidade.'}
            </p>
          </div>
        </div>
      ) : (
        <form id={formId} onSubmit={enviar} className="space-y-4">
          {comAlvo && targetName ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Você está abrindo um chamado contra <strong>{targetName}</strong>. A administração só acessa as conexões e
              reuniões dessa pessoa por causa desta denúncia.
            </div>
          ) : null}

          {erro && <Alert mensagem={erro} />}

          <div>
            <label htmlFor="ticket-categoria" className="label">
              Categoria
            </label>
            <select
              id="ticket-categoria"
              className="input"
              value={categoria}
              onChange={(evento) => setCategoria(evento.target.value as TicketCategory)}
            >
              {categorias.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-assunto" className="label">
              Assunto
            </label>
            <input
              id="ticket-assunto"
              className="input"
              maxLength={160}
              value={assunto}
              onChange={(evento) => setAssunto(evento.target.value)}
              placeholder="Resuma o problema em uma frase"
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{assunto.trim().length}/160 caracteres</p>
          </div>

          <div>
            <label htmlFor="ticket-descricao" className="label">
              O que aconteceu
            </label>
            <textarea
              id="ticket-descricao"
              className="input min-h-[150px] resize-y"
              maxLength={4000}
              value={descricao}
              onChange={(evento) => setDescricao(evento.target.value)}
              placeholder="Conte com detalhes o que aconteceu, quando e o que você espera da administração."
              required
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {descricao.trim().length}/4000 caracteres · mínimo de 20.
            </p>
          </div>
        </form>
      )}
    </Modal>
  );
}
