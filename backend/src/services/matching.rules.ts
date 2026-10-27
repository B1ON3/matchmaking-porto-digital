export const PESOS = {
  setor: 35,
  estagio: 25,
  ticket: 25,
  regiao: 15,
} as const;

// selo de perfil verificado pela administracao: nao e criterio de afinidade,
// e um bonus de confianca. vale para os dois lados do match.
export const BONUS_VERIFICADO = 5;
export const BONUS_MAXIMO = BONUS_VERIFICADO * 2;
export const ESCORE_MAXIMO = 100;

export type StartupLike = {
  sector: string;
  stage: string;
  state: string;
  verificado?: boolean;
};

export type InvestorLike = {
  sectorInterest: string;
  stageInterest: string;
  ticketMin: number;
  ticketMax: number;
  state: string;
  verificado?: boolean;
};

export type MatchDetails = {
  setor: number;
  estagio: number;
  ticket: number;
  regiao: number;
  verificacao: number;
};

export type MatchScore = {
  score: number;
  reason: string;
  details: MatchDetails;
};

const ALIASES: Record<string, string> = {
  tech: 'tecnologia',
  ti: 'tecnologia',
  software: 'tecnologia',
  edtech: 'educacao',
  healthtech: 'saude',
  fintech: 'financas',
  creative: 'economia criativa',
  criativa: 'economia criativa',
};

const ESTAGIOS = ['ideacao', 'pre-seed', 'seed', 'serie a', 'serie b'];

const ESTADOS_NORDESTE = ['PE', 'PB', 'RN', 'CE', 'AL', 'SE', 'BA', 'PI', 'MA'];

export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizarLista(valor: string): string[] {
  return valor
    .split(/[,;/|]/)
    .map((item) => normalizarTexto(item))
    .map((item) => ALIASES[item] ?? item)
    .filter(Boolean);
}

export function estimaTicketDaRodada(stage: string): number {
  const estagio = normalizarTexto(stage);

  if (estagio.includes('ideacao') || estagio.includes('pre-seed')) {
    return 30000;
  }

  if (estagio.includes('seed')) {
    return 150000;
  }

  if (estagio.includes('serie a')) {
    return 500000;
  }

  if (estagio.includes('serie b')) {
    return 1500000;
  }

  return 100000;
}

function tokensSeRelacionam(a: string, b: string): boolean {
  return a === b || a.includes(b) || b.includes(a);
}

export function calculaSetor(startup: StartupLike, investor: InvestorLike): number {
  const setoresStartup = normalizarLista(startup.sector);
  const interesses = normalizarLista(investor.sectorInterest);

  if (setoresStartup.length === 0 || interesses.length === 0) {
    return 0;
  }

  const acertou = setoresStartup.some((setor) => interesses.some((interesse) => tokensSeRelacionam(setor, interesse)));

  return acertou ? PESOS.setor : 0;
}

export function calculaEstagio(startup: StartupLike, investor: InvestorLike): number {
  const indiceStartup = ESTAGIOS.indexOf(normalizarTexto(startup.stage));

  if (indiceStartup === -1) {
    return 0;
  }

  const distancias = normalizarLista(investor.stageInterest)
    .map((estagio) => ESTAGIOS.indexOf(estagio))
    .filter((indice) => indice !== -1)
    .map((indice) => Math.abs(indice - indiceStartup));

  if (distancias.length === 0) {
    return 0;
  }

  const menorDistancia = Math.min(...distancias);

  if (menorDistancia === 0) {
    return PESOS.estagio;
  }

  if (menorDistancia === 1) {
    return 15;
  }

  if (menorDistancia === 2) {
    return 5;
  }

  return 0;
}

export function calculaTicket(startup: StartupLike, investor: InvestorLike): number {
  if (investor.ticketMin === 0 && investor.ticketMax === 0) {
    return 0;
  }

  const rodadaEstimada = estimaTicketDaRodada(startup.stage);
  const teto = Math.max(investor.ticketMin, investor.ticketMax);

  if (rodadaEstimada >= investor.ticketMin && rodadaEstimada <= teto) {
    return PESOS.ticket;
  }

  const distancia = rodadaEstimada < investor.ticketMin ? investor.ticketMin - rodadaEstimada : rodadaEstimada - teto;

  const proximidade = Math.max(0, 1 - distancia / teto);

  return Math.round(PESOS.ticket * proximidade * 0.5);
}

export function calculaRegiao(startup: StartupLike, investor: InvestorLike): number {
  const ufStartup = startup.state.trim().toUpperCase();
  const ufInvestidor = investor.state.trim().toUpperCase();

  if (ufStartup === ufInvestidor) {
    return PESOS.regiao;
  }

  if (ESTADOS_NORDESTE.includes(ufStartup) && ESTADOS_NORDESTE.includes(ufInvestidor)) {
    return 8;
  }

  return 0;
}

export function calculaVerificacao(startup: StartupLike, investor: InvestorLike): number {
  return (startup.verificado ? BONUS_VERIFICADO : 0) + (investor.verificado ? BONUS_VERIFICADO : 0);
}

export function montaReason(score: number): string {
  if (score >= 80) {
    return 'Conexão forte: setor, estágio e ticket alinhados.';
  }

  if (score >= 60) {
    return 'Boa afinidade: a maior parte dos critérios bate.';
  }

  if (score >= 40) {
    return 'Afinidade moderada: vale uma conversa para explorar.';
  }

  if (score > 0) {
    return 'Afinidade baixa: poucos pontos em comum, mas a conversa continua aberta.';
  }

  return 'Sem critérios de afinidade suficientes.';
}

export function calculaScore(startup: StartupLike, investor: InvestorLike): MatchScore {
  const setor = calculaSetor(startup, investor);
  const estagio = calculaEstagio(startup, investor);
  const ticket = calculaTicket(startup, investor);
  const regiao = calculaRegiao(startup, investor);
  const base = setor + estagio + ticket + regiao;

  // o selo e um bonus de confianca: so vale quando ja existe alguma afinidade,
  // para nao criar conexoes artificiais so porque o perfil foi verificado
  const details = {
    setor,
    estagio,
    ticket,
    regiao,
    verificacao: base > 0 ? calculaVerificacao(startup, investor) : 0,
  };

  // o bonus eleva a confianca, mas nao passa de 100
  const bruto = base + details.verificacao;
  const score = Number(Math.min(ESCORE_MAXIMO, bruto).toFixed(1));

  return {
    score,
    reason: montaReason(score),
    details,
  };
}
