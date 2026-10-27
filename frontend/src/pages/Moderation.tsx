import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '../components/Alert';
import { Tabs } from '../components/Tabs';
import { AuditTab } from './moderation/AuditTab';
import { MetricsTab } from './moderation/MetricsTab';
import { PeopleTab } from './moderation/PeopleTab';
import { VerificationsTab } from './moderation/VerificationsTab';

type Aba = 'pessoas' | 'validacoes' | 'auditoria' | 'metricas';

const ABAS = [
  { id: 'pessoas', label: 'Pessoas' },
  { id: 'validacoes', label: 'Validações' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'metricas', label: 'Métricas' },
];

const ABAS_VALIDAS: Aba[] = ['pessoas', 'validacoes', 'auditoria', 'metricas'];

function abaInicialDoParam(valor: string | null): Aba {
  return valor && ABAS_VALIDAS.includes(valor as Aba) ? (valor as Aba) : 'pessoas';
}

export function Moderation() {
  const [parametros, setParametros] = useSearchParams();
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState<Aba>(() => abaInicialDoParam(parametros.get('aba')));

  function trocarAba(id: string) {
    const proxima = abaInicialDoParam(id);
    setAba(proxima);
    setParametros(proxima === 'pessoas' ? {} : { aba: proxima }, { replace: true });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Governança</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-slate-900 dark:text-areia-100">
          Sala de Controle
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Consulte pessoas e reputação, analise pedidos de selo, acompanhe o uso do ecossistema e audite cada ação
          administrativa. A moderação de contas acontece somente a partir dos chamados.
        </p>
      </div>

      <Tabs tabs={ABAS} active={aba} onChange={trocarAba} />

      {aviso && <Alert tipo="sucesso" mensagem={aviso} />}

      {aba === 'pessoas' && <PeopleTab />}
      {aba === 'validacoes' && <VerificationsTab />}
      {aba === 'auditoria' && <AuditTab />}
      {aba === 'metricas' && <MetricsTab onAviso={setAviso} />}
    </div>
  );
}
