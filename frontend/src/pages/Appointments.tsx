import { AgendaPanel } from '../components/AgendaPanel';
import { useAgenda } from '../context/AgendaContext';

export function Appointments() {
  const { refresh } = useAgenda();

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Agenda</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">Agendamentos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Marque as conversas que você quer ter.</p>
      </div>

      <AgendaPanel
        onChanged={() => {
          void refresh();
        }}
      />
    </div>
  );
}
