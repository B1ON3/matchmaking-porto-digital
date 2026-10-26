import { useState } from 'react';
import { Alert } from '../components/Alert';
import { Tabs } from '../components/Tabs';
import { AuditTab } from './moderation/AuditTab';
import { MetricsTab } from './moderation/MetricsTab';
import { PeopleTab } from './moderation/PeopleTab';

type Aba = 'pessoas' | 'auditoria' | 'metricas';

const ABAS = [
  { id: 'pessoas', label: 'Pessoas' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'metricas', label: 'Métricas' },
];

export function Moderation() {
  const [aba, setAba] = useState<Aba>('pessoas');
  const [aviso, setAviso] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Governança</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">
          Sala de Controle
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Consulte pessoas e reputação, acompanhe o uso do ecossistema e audite cada ação administrativa. A moderação de
          contas acontece somente a partir dos chamados.
        </p>
      </div>

      <Tabs tabs={ABAS} active={aba} onChange={(id) => setAba(id as Aba)} />

      {aviso && <Alert tipo="sucesso" mensagem={aviso} />}

      {aba === 'pessoas' && <PeopleTab />}
      {aba === 'auditoria' && <AuditTab />}
      {aba === 'metricas' && <MetricsTab onAviso={setAviso} />}
    </div>
  );
}
