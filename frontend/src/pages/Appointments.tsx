import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '../components/Alert';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { appointmentService } from '../services';
import { extractErrorMessage } from '../services/api';
import type { Appointment, AppointmentStatus } from '../types';

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const corStatus: Record<AppointmentStatus, string> = {
  AGENDADO: 'bg-porto-50 text-porto-700',
  CONCLUIDO: 'bg-emerald-50 text-emerald-700',
  CANCELADO: 'bg-slate-100 text-slate-600',
};

export function Appointments() {
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduledAt: '',
  });

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      setCarregando(true);

      try {
        const lista = await appointmentService.list();

        if (ativo) {
          setAgendamentos(lista);
        }
      } catch (e) {
        if (ativo) {
          setErro(extractErrorMessage(e));
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      const criado = await appointmentService.create({
        title: form.title,
        description: form.description || undefined,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });

      setAgendamentos((atual) =>
        [...atual, criado].sort(
          (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
      );

      setForm({ title: '', description: '', scheduledAt: '' });
    } catch (e) {
      setErro(extractErrorMessage(e));
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(id: string, status: AppointmentStatus) {
    try {
      const atualizado = await appointmentService.updateStatus(id, status);
      setAgendamentos((atual) =>
        atual.map((item) => (item.id === id ? atualizado : item)),
      );
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }

  async function remover(id: string) {
    try {
      await appointmentService.remove(id);
      setAgendamentos((atual) => atual.filter((item) => item.id !== id));
    } catch (e) {
      setErro(extractErrorMessage(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Agendamentos</h1>
        <p className="text-sm text-slate-500">Marque as conversas que você quer ter.</p>
      </div>

      {erro && <Alert mensagem={erro} />}

      <form onSubmit={handleSubmit} className="card max-w-3xl space-y-4">
        <h2 className="font-semibold text-slate-900">Novo agendamento</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="a-title" className="label">
              Título
            </label>
            <input
              id="a-title"
              className="input"
              value={form.title}
              onChange={(e) => setForm((a) => ({ ...a, title: e.target.value }))}
              placeholder="Conversa sobre a rodada seed"
              required
            />
          </div>
          <div>
            <label htmlFor="a-date" className="label">
              Data e hora
            </label>
            <input
              id="a-date"
              type="datetime-local"
              className="input"
              value={form.scheduledAt}
              onChange={(e) => setForm((a) => ({ ...a, scheduledAt: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="a-desc" className="label">
            Descrição
          </label>
          <textarea
            id="a-desc"
            className="input min-h-[70px]"
            value={form.description}
            onChange={(e) => setForm((a) => ({ ...a, description: e.target.value }))}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={salvando}>
          {salvando ? 'Agendando...' : 'Agendar'}
        </button>
      </form>

      {carregando ? (
        <Spinner texto="Carregando sua agenda..." />
      ) : agendamentos.length === 0 ? (
        <EmptyState
          titulo="Nenhum agendamento"
          descricao="Use o formulário acima para marcar sua primeira conversa."
        />
      ) : (
        <ul className="space-y-3">
          {agendamentos.map((agendamento) => (
            <li key={agendamento.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-900">{agendamento.title}</h3>
                  <p className="text-sm text-slate-500">{dataHora(agendamento.scheduledAt)}</p>
                  {agendamento.description && (
                    <p className="mt-1 text-sm text-slate-600">{agendamento.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`badge ${corStatus[agendamento.status]}`}>
                    {agendamento.status}
                  </span>
                </div>
              </div>

              {agendamento.status === 'AGENDADO' && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => mudarStatus(agendamento.id, 'CONCLUIDO')}
                    className="btn-secondary"
                  >
                    Marcar como concluído
                  </button>
                  <button
                    type="button"
                    onClick={() => mudarStatus(agendamento.id, 'CANCELADO')}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => remover(agendamento.id)}
                className="mt-2 text-sm text-rose-600 hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}