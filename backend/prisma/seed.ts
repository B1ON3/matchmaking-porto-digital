import {
  AppointmentStatus,
  MatchStatus,
  PrismaClient,
  ProjectStatus,
  UserRole,
  type InvestorProfile,
  type StartupProfile,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculaScore } from '../src/services/matching.rules';

const prisma = new PrismaClient();

const SENHA_DEMO = 'senha123';

type StartupSeed = {
  email: string;
  name: string;
  companyName: string;
  sector: string;
  description: string;
  stage: string;
  city: string;
  state: string;
  website: string | null;
  foundedAt: Date;
  needs: string;
  pitchUrl: string | null;
  logoUrl: string | null;
};

type InvestorSeed = {
  email: string;
  name: string;
  companyName: string;
  sectorInterest: string;
  stageInterest: string;
  ticketMin: number;
  ticketMax: number;
  city: string;
  state: string;
  bio: string;
};

type ProjectSeed = {
  startup: number;
  title: string;
  summary: string;
  status: ProjectStatus;
};

type MatchSeed = {
  startup: number;
  investor: number;
  status: MatchStatus;
};

type MessageSeed = {
  startup: number;
  investor: number;
  from: 'startup' | 'investor';
  content: string;
  read: boolean;
};

type AppointmentSeed = {
  startup: number;
  investor: number;
  createdBy: 'startup' | 'investor';
  title: string;
  description: string;
  daysFromNow: number;
  status: AppointmentStatus;
};

const startups: StartupSeed[] = [
  {
    email: 'startup@porto.digital',
    name: 'Ana Caroline',
    companyName: 'Recife Tech Studio',
    sector: 'Tecnologia',
    description: 'Studio de desenvolvimento de produtos digitais para o mercado nordestino.',
    stage: 'Seed',
    city: 'Recife',
    state: 'PE',
    website: 'https://recifetech.studio',
    foundedAt: new Date('2021-03-01'),
    needs: 'Rodada seed para contratar time de produto e expandir vendas.',
    pitchUrl: 'https://recifetech.studio/pitch',
    logoUrl: null,
  },
  {
    email: 'startup2@porto.digital',
    name: 'Marina Costa',
    companyName: 'Mangue Digital',
    sector: 'Design',
    description: 'Estúdio de design e experiências digitais para marcas da economia criativa.',
    stage: 'Pre-seed',
    city: 'Recife',
    state: 'PE',
    website: 'https://mangue.digital',
    foundedAt: new Date('2023-05-12'),
    needs: 'Aceleração e primeira rodada para ampliar o time criativo.',
    pitchUrl: null,
    logoUrl: null,
  },
  {
    email: 'startup3@porto.digital',
    name: 'Rafael Lima',
    companyName: 'AgroSense',
    sector: 'Agronegócio',
    description: 'Sensores e análise de dados para pequenos produtores do agreste pernambucano.',
    stage: 'Seed',
    city: 'Caruaru',
    state: 'PE',
    website: 'https://agrosense.com.br',
    foundedAt: new Date('2020-09-18'),
    needs: 'Expansão para o interior e parcerias com cooperativas.',
    pitchUrl: null,
    logoUrl: null,
  },
  {
    email: 'startup4@porto.digital',
    name: 'Juliana Alves',
    companyName: 'Saúde Já',
    sector: 'Healthtech',
    description: 'Teleconsulta e acompanhamento preventivo para beneficiários de planos regionais.',
    stage: 'Série A',
    city: 'Recife',
    state: 'PE',
    website: 'https://saudeja.com.br',
    foundedAt: new Date('2019-02-04'),
    needs: 'Escala nacional e integração com operadoras de saúde.',
    pitchUrl: 'https://saudeja.com.br/investidores',
    logoUrl: null,
  },
  {
    email: 'startup5@porto.digital',
    name: 'Pedro Santos',
    companyName: 'Educa Mais',
    sector: 'Edtech',
    description: 'Trilhas de aprendizagem adaptativas para escolas públicas do Nordeste.',
    stage: 'Ideação',
    city: 'Olinda',
    state: 'PE',
    website: null,
    foundedAt: new Date('2024-08-20'),
    needs: 'Validação com escolas públicas e primeira rodada anjo.',
    pitchUrl: null,
    logoUrl: null,
  },
  {
    email: 'startup6@porto.digital',
    name: 'Camila Rocha',
    companyName: 'FinNorte',
    sector: 'Fintech',
    description: 'Motor de crédito e onboarding digital para cooperativas de crédito do Nordeste.',
    stage: 'Pre-seed',
    city: 'Fortaleza',
    state: 'CE',
    website: 'https://finnorte.com.br',
    foundedAt: new Date('2022-11-03'),
    needs: 'Licença regulatória e primeiros parceiros regionais.',
    pitchUrl: null,
    logoUrl: null,
  },
];

const investors: InvestorSeed[] = [
  {
    email: 'investidor@porto.digital',
    name: 'Bruno Tavares',
    companyName: 'Nordeste Capital',
    sectorInterest: 'Tecnologia, Design',
    stageInterest: 'Seed, Pre-seed',
    ticketMin: 50000,
    ticketMax: 300000,
    city: 'Recife',
    state: 'PE',
    bio: 'Investidor anjo com foco no ecossistema criativo do Recife.',
  },
  {
    email: 'investidor2@porto.digital',
    name: 'Helena Duarte',
    companyName: 'Atlântico Ventures',
    sectorInterest: 'Fintech, SaaS',
    stageInterest: 'Seed, Série A',
    ticketMin: 200000,
    ticketMax: 1500000,
    city: 'Recife',
    state: 'PE',
    bio: 'Fundo regional com tese em software B2B e infraestrutura financeira.',
  },
  {
    email: 'investidor3@porto.digital',
    name: 'Carlos Menezes',
    companyName: 'Anjo Criativo',
    sectorInterest: 'Economia Criativa, Design',
    stageInterest: 'Pre-seed, Seed',
    ticketMin: 30000,
    ticketMax: 150000,
    city: 'Olinda',
    state: 'PE',
    bio: 'Investidor anjo e mentor de marcas e negócios criativos.',
  },
  {
    email: 'investidor4@porto.digital',
    name: 'Beatriz Nunes',
    companyName: 'Impacto Nordeste',
    sectorInterest: 'Healthtech, Edtech',
    stageInterest: 'Seed, Série A',
    ticketMin: 100000,
    ticketMax: 800000,
    city: 'Fortaleza',
    state: 'CE',
    bio: 'Fundo de impacto com foco em saúde, educação e tecnologias sociais.',
  },
  {
    email: 'investidor5@porto.digital',
    name: 'Felipe Barros',
    companyName: 'Agro Capital',
    sectorInterest: 'Agronegócio, Tecnologia',
    stageInterest: 'Pre-seed, Seed',
    ticketMin: 50000,
    ticketMax: 500000,
    city: 'Caruaru',
    state: 'PE',
    bio: 'Investidor com rede forte no agreste e no agronegócio familiar.',
  },
  {
    email: 'investidor6@porto.digital',
    name: 'Larissa Gomes',
    companyName: 'Recife Angels',
    sectorInterest: 'Tecnologia, Fintech, Edtech',
    stageInterest: 'Ideação, Pre-seed',
    ticketMin: 30000,
    ticketMax: 100000,
    city: 'Recife',
    state: 'PE',
    bio: 'Rede de anjos que investe em fundadores do Nordeste desde a ideação.',
  },
];

const projects: ProjectSeed[] = [
  {
    startup: 0,
    title: 'Portal do investidor',
    summary: 'Área com tese, tração e documentos da rodada.',
    status: ProjectStatus.CONCLUIDO,
  },
  {
    startup: 0,
    title: 'App de conexões',
    summary: 'Experiência mobile para acompanhar matches e conversas.',
    status: ProjectStatus.EM_ANDAMENTO,
  },
  {
    startup: 0,
    title: 'Painel de métricas',
    summary: 'Indicadores de engajamento para o time de produto.',
    status: ProjectStatus.PLANEJADO,
  },
  {
    startup: 1,
    title: 'Identidade visual',
    summary: 'Nova marca e sistema de comunicação.',
    status: ProjectStatus.CONCLUIDO,
  },
  {
    startup: 1,
    title: 'Design system',
    summary: 'Biblioteca de componentes para os clientes.',
    status: ProjectStatus.EM_ANDAMENTO,
  },
  {
    startup: 2,
    title: 'Sensores de campo',
    summary: 'Kit de baixo custo para monitoramento de solo.',
    status: ProjectStatus.EM_ANDAMENTO,
  },
  {
    startup: 2,
    title: 'Relatórios climáticos',
    summary: 'Alertas e recomendações para produtores.',
    status: ProjectStatus.PLANEJADO,
  },
  {
    startup: 3,
    title: 'Teleconsulta',
    summary: 'Plataforma de atendimento remoto com prontuário.',
    status: ProjectStatus.CONCLUIDO,
  },
  {
    startup: 3,
    title: 'Integração com operadoras',
    summary: 'Conectores para faturamento e elegibilidade.',
    status: ProjectStatus.EM_ANDAMENTO,
  },
  {
    startup: 3,
    title: 'Programa de prevenção',
    summary: 'Jornadas de cuidado para pacientes crônicos.',
    status: ProjectStatus.PLANEJADO,
  },
  {
    startup: 4,
    title: 'Trilhas de aprendizagem',
    summary: 'Conteúdo adaptativo por habilidade e série.',
    status: ProjectStatus.EM_ANDAMENTO,
  },
  {
    startup: 4,
    title: 'Painel do professor',
    summary: 'Visão de turma e recomendações pedagógicas.',
    status: ProjectStatus.PLANEJADO,
  },
  {
    startup: 5,
    title: 'Motor de crédito',
    summary: 'Análise de risco para cooperativas parceiras.',
    status: ProjectStatus.EM_ANDAMENTO,
  },
  {
    startup: 5,
    title: 'Onboarding digital',
    summary: 'Cadastro e validação de documentos em minutos.',
    status: ProjectStatus.CONCLUIDO,
  },
  {
    startup: 5,
    title: 'Antifraude',
    summary: 'Regras e sinais para prevenção a fraudes.',
    status: ProjectStatus.PLANEJADO,
  },
];

const matches: MatchSeed[] = [
  { startup: 0, investor: 0, status: MatchStatus.ACEITO },
  { startup: 0, investor: 1, status: MatchStatus.PENDENTE },
  { startup: 0, investor: 5, status: MatchStatus.ACEITO },
  { startup: 1, investor: 2, status: MatchStatus.ACEITO },
  { startup: 1, investor: 0, status: MatchStatus.PENDENTE },
  { startup: 1, investor: 5, status: MatchStatus.PENDENTE },
  { startup: 2, investor: 4, status: MatchStatus.ACEITO },
  { startup: 2, investor: 1, status: MatchStatus.PENDENTE },
  { startup: 2, investor: 3, status: MatchStatus.PENDENTE },
  { startup: 3, investor: 3, status: MatchStatus.ACEITO },
  { startup: 3, investor: 1, status: MatchStatus.ACEITO },
  { startup: 3, investor: 0, status: MatchStatus.PENDENTE },
  { startup: 4, investor: 5, status: MatchStatus.ACEITO },
  { startup: 4, investor: 2, status: MatchStatus.PENDENTE },
  { startup: 4, investor: 3, status: MatchStatus.PENDENTE },
  { startup: 5, investor: 1, status: MatchStatus.ACEITO },
  { startup: 5, investor: 5, status: MatchStatus.ACEITO },
  { startup: 5, investor: 0, status: MatchStatus.RECUSADO },
];

const messages: MessageSeed[] = [
  {
    startup: 0,
    investor: 0,
    from: 'startup',
    content: 'Oi, Bruno! Obrigada pela conexão. Posso te contar mais sobre a rodada seed?',
    read: true,
  },
  {
    startup: 0,
    investor: 0,
    from: 'investor',
    content: 'Claro, Ana. Me manda o deck e uma prévia dos números.',
    read: true,
  },
  {
    startup: 0,
    investor: 5,
    from: 'startup',
    content: 'Larissa, vi que você investe em tech no Recife. Podemos conversar?',
    read: true,
  },
  {
    startup: 0,
    investor: 5,
    from: 'investor',
    content: 'Podemos sim. Tenho interesse em entender o produto.',
    read: false,
  },
  {
    startup: 1,
    investor: 2,
    from: 'startup',
    content: 'Carlos, seu olhar para design é exatamente o que buscamos.',
    read: true,
  },
  { startup: 1, investor: 2, from: 'investor', content: 'Gostei do portfólio. Vamos marcar uma call?', read: true },
  {
    startup: 2,
    investor: 4,
    from: 'startup',
    content: 'Felipe, temos dados de campo que podem interessar ao Agro Capital.',
    read: true,
  },
  { startup: 2, investor: 4, from: 'investor', content: 'Manda o material. Quero ver a tração.', read: false },
  {
    startup: 3,
    investor: 3,
    from: 'startup',
    content: 'Beatriz, a Saúde Já está expandindo para convênios. Podemos falar?',
    read: true,
  },
  { startup: 3, investor: 3, from: 'investor', content: 'Sim, quero entender o modelo de receita.', read: true },
  {
    startup: 3,
    investor: 1,
    from: 'startup',
    content: 'Helena, sua tese de SaaS combina com a nossa infraestrutura.',
    read: true,
  },
  {
    startup: 3,
    investor: 1,
    from: 'investor',
    content: 'Vamos agendar. Tenho algumas perguntas sobre churn.',
    read: false,
  },
  {
    startup: 4,
    investor: 5,
    from: 'startup',
    content: 'Larissa, a Educa Mais está validando com escolas públicas.',
    read: true,
  },
  {
    startup: 4,
    investor: 5,
    from: 'investor',
    content: 'Interessante. Quero ver os indicadores de aprendizagem.',
    read: true,
  },
  {
    startup: 5,
    investor: 1,
    from: 'startup',
    content: 'Helena, a FinNorte está licenciando o motor de crédito.',
    read: true,
  },
  { startup: 5, investor: 1, from: 'investor', content: 'Boa. Me conta sobre a conformidade regulatória.', read: true },
  {
    startup: 5,
    investor: 5,
    from: 'startup',
    content: 'Larissa, obrigado pela conexão. Podemos falar sobre o piloto?',
    read: true,
  },
  { startup: 5, investor: 5, from: 'investor', content: 'Vamos marcar. Quero entender o CAC.', read: false },
];

const appointments: AppointmentSeed[] = [
  {
    startup: 0,
    investor: 0,
    createdBy: 'startup',
    title: 'Conversa sobre rodada seed',
    description: 'Apresentação do deck e alinhamento de expectativas.',
    daysFromNow: 2,
    status: AppointmentStatus.AGENDADO,
  },
  {
    startup: 1,
    investor: 2,
    createdBy: 'investor',
    title: 'Revisão de portfólio e design',
    description: 'Deep dive no portfólio e no posicionamento da Mangue Digital.',
    daysFromNow: 4,
    status: AppointmentStatus.AGENDADO,
  },
  {
    startup: 2,
    investor: 4,
    createdBy: 'startup',
    title: 'Due diligence inicial',
    description: 'Conversa sobre tração, sensores e parcerias com cooperativas.',
    daysFromNow: 7,
    status: AppointmentStatus.AGENDADO,
  },
  {
    startup: 3,
    investor: 3,
    createdBy: 'investor',
    title: 'Alinhamento de expansão',
    description: 'Modelo de receita e integração com operadoras de saúde.',
    daysFromNow: 3,
    status: AppointmentStatus.AGENDADO,
  },
  {
    startup: 5,
    investor: 1,
    createdBy: 'startup',
    title: 'Piloto do motor de crédito',
    description: 'Resultados do piloto e próximos passos regulatórios.',
    daysFromNow: -2,
    status: AppointmentStatus.CONCLUIDO,
  },
  {
    startup: 5,
    investor: 5,
    createdBy: 'investor',
    title: 'Conversa sobre tração',
    description: 'Indicadores de aquisição e retenção da FinNorte.',
    daysFromNow: 10,
    status: AppointmentStatus.CANCELADO,
  },
];

const auditLogs = [
  { action: 'LOGIN', entity: 'auth', details: 'Login administrativo', user: 'admin', hoursAgo: 2 },
  { action: 'LOGIN', entity: 'auth', details: 'Login da startup', user: 'startup0', hoursAgo: 5 },
  { action: 'LOGIN', entity: 'auth', details: 'Login do investidor', user: 'investor0', hoursAgo: 8 },
  {
    action: 'MATCH_ACEITO',
    entity: 'match',
    details: 'Conexão aceita pela startup',
    user: 'startup0',
    hoursAgo: 12,
    match: [0, 0] as [number, number],
  },
  {
    action: 'MATCH_ACEITO',
    entity: 'match',
    details: 'Conexão aceita pelo investidor',
    user: 'investor3',
    hoursAgo: 15,
    match: [3, 3] as [number, number],
  },
  {
    action: 'PROJETO_CRIADO',
    entity: 'project',
    details: 'Projeto cadastrado no painel',
    user: 'startup0',
    hoursAgo: 20,
  },
  {
    action: 'AGENDAMENTO_CRIADO',
    entity: 'appointment',
    details: 'Reunião proposta a partir de um match',
    user: 'startup0',
    hoursAgo: 26,
  },
  {
    action: 'PERFIL_ATUALIZADO',
    entity: 'investor',
    details: 'Tese de investimento revisada',
    user: 'investor0',
    hoursAgo: 30,
  },
  {
    action: 'USUARIO_CRIADO',
    entity: 'user',
    details: 'Mentora convidada para o ecossistema',
    user: 'admin',
    hoursAgo: 36,
  },
  {
    action: 'MATCH_RECUSADO',
    entity: 'match',
    details: 'Conexão recusada pela startup',
    user: 'startup5',
    hoursAgo: 42,
    match: [5, 0] as [number, number],
  },
];

function seededId(group: number, index: number): string {
  const groupHex = group.toString(16).padStart(8, '0');
  const indexHex = index.toString(16).padStart(12, '0');
  return `${groupHex}-0000-4000-8000-${indexHex}`;
}

function pairKey(startup: number, investor: number): string {
  return `${startup}:${investor}`;
}

type MatchRef = {
  id: string;
  startup: StartupProfile;
  investor: InvestorProfile;
};

async function seedAuditLogs(
  userIds: Record<string, string>,
  matchByPair: Map<string, MatchRef>,
  adminId: string,
  mentorId: string,
): Promise<void> {
  for (const [index, log] of auditLogs.entries()) {
    const match = log.match ? matchByPair.get(pairKey(log.match[0], log.match[1])) : undefined;
    const entityId =
      log.entity === 'match'
        ? (match?.id ?? null)
        : log.entity === 'project'
          ? seededId(4, 1)
          : log.entity === 'appointment'
            ? seededId(7, 1)
            : log.entity === 'user'
              ? mentorId
              : null;

    await prisma.auditLog.upsert({
      where: { id: seededId(8, index + 1) },
      update: {},
      create: {
        id: seededId(8, index + 1),
        action: log.action,
        entity: log.entity,
        entityId,
        details: log.details,
        ip: '127.0.0.1',
        userAgent: 'seed-demo',
        userId: userIds[log.user] ?? adminId,
        createdAt: new Date(Date.now() - log.hoursAgo * 60 * 60 * 1000),
      },
    });
  }
}

async function main() {
  console.log('populando o banco com dados de exemplo...');

  const senhaHash = await bcrypt.hash(SENHA_DEMO, 10);
  const startupProfiles: StartupProfile[] = [];
  const investorProfiles: InvestorProfile[] = [];

  for (const [index, seed] of startups.entries()) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, passwordHash: senhaHash, role: UserRole.STARTUP },
      create: {
        id: seededId(1, index + 1),
        name: seed.name,
        email: seed.email,
        passwordHash: senhaHash,
        role: UserRole.STARTUP,
      },
    });

    const profile = await prisma.startupProfile.upsert({
      where: { userId: user.id },
      update: {
        companyName: seed.companyName,
        sector: seed.sector,
        description: seed.description,
        stage: seed.stage,
        city: seed.city,
        state: seed.state,
        website: seed.website,
        foundedAt: seed.foundedAt,
        needs: seed.needs,
        pitchUrl: seed.pitchUrl,
        logoUrl: seed.logoUrl,
      },
      create: {
        id: seededId(2, index + 1),
        userId: user.id,
        companyName: seed.companyName,
        sector: seed.sector,
        description: seed.description,
        stage: seed.stage,
        city: seed.city,
        state: seed.state,
        website: seed.website,
        foundedAt: seed.foundedAt,
        needs: seed.needs,
        pitchUrl: seed.pitchUrl,
        logoUrl: seed.logoUrl,
      },
    });

    startupProfiles.push(profile);
  }

  for (const [index, seed] of investors.entries()) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: { name: seed.name, passwordHash: senhaHash, role: UserRole.INVESTOR },
      create: {
        id: seededId(1, index + 20),
        name: seed.name,
        email: seed.email,
        passwordHash: senhaHash,
        role: UserRole.INVESTOR,
      },
    });

    const profile = await prisma.investorProfile.upsert({
      where: { userId: user.id },
      update: {
        companyName: seed.companyName,
        sectorInterest: seed.sectorInterest,
        stageInterest: seed.stageInterest,
        ticketMin: seed.ticketMin,
        ticketMax: seed.ticketMax,
        city: seed.city,
        state: seed.state,
        bio: seed.bio,
      },
      create: {
        id: seededId(3, index + 1),
        userId: user.id,
        companyName: seed.companyName,
        sectorInterest: seed.sectorInterest,
        stageInterest: seed.stageInterest,
        ticketMin: seed.ticketMin,
        ticketMax: seed.ticketMax,
        city: seed.city,
        state: seed.state,
        bio: seed.bio,
      },
    });

    investorProfiles.push(profile);
  }

  const mentor = await prisma.user.upsert({
    where: { email: 'mentor@porto.digital' },
    update: { name: 'Sofia Mendes', passwordHash: senhaHash, role: UserRole.MENTOR },
    create: {
      id: seededId(1, 40),
      name: 'Sofia Mendes',
      email: 'mentor@porto.digital',
      passwordHash: senhaHash,
      role: UserRole.MENTOR,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@porto.digital' },
    update: { name: 'Administrador', passwordHash: senhaHash, role: UserRole.ADMIN },
    create: {
      id: seededId(1, 41),
      name: 'Administrador',
      email: 'admin@porto.digital',
      passwordHash: senhaHash,
      role: UserRole.ADMIN,
    },
  });

  for (const [index, project] of projects.entries()) {
    await prisma.project.upsert({
      where: { id: seededId(4, index + 1) },
      update: {
        startupId: startupProfiles[project.startup].id,
        title: project.title,
        summary: project.summary,
        status: project.status,
      },
      create: {
        id: seededId(4, index + 1),
        startupId: startupProfiles[project.startup].id,
        title: project.title,
        summary: project.summary,
        status: project.status,
      },
    });
  }

  const matchByPair = new Map<string, MatchRef>();

  for (const seed of matches) {
    const startup = startupProfiles[seed.startup];
    const investor = investorProfiles[seed.investor];
    const score = calculaScore(startup, investor);

    const match = await prisma.match.upsert({
      where: {
        startupId_investorId: {
          startupId: startup.id,
          investorId: investor.id,
        },
      },
      update: {
        score: score.score,
        reason: score.reason,
        details: score.details,
        status: seed.status,
      },
      create: {
        startupId: startup.id,
        investorId: investor.id,
        score: score.score,
        reason: score.reason,
        details: score.details,
        status: seed.status,
      },
    });

    matchByPair.set(pairKey(seed.startup, seed.investor), { id: match.id, startup, investor });
  }

  for (const [index, message] of messages.entries()) {
    const match = matchByPair.get(pairKey(message.startup, message.investor));

    if (!match) {
      continue;
    }

    const senderId = message.from === 'startup' ? match.startup.userId : match.investor.userId;
    const recipientId = message.from === 'startup' ? match.investor.userId : match.startup.userId;

    await prisma.message.upsert({
      where: { id: seededId(6, index + 1) },
      update: {},
      create: {
        id: seededId(6, index + 1),
        content: message.content,
        senderId,
        recipientId,
        readAt: message.read ? new Date(Date.now() - (index + 1) * 60 * 60 * 1000) : null,
        createdAt: new Date(Date.now() - (index + 1) * 2 * 60 * 60 * 1000),
      },
    });
  }

  for (const [index, appointment] of appointments.entries()) {
    const match = matchByPair.get(pairKey(appointment.startup, appointment.investor));

    if (!match) {
      continue;
    }

    const createdById = appointment.createdBy === 'startup' ? match.startup.userId : match.investor.userId;

    await prisma.appointment.upsert({
      where: { id: seededId(7, index + 1) },
      update: {},
      create: {
        id: seededId(7, index + 1),
        title: appointment.title,
        description: appointment.description,
        scheduledAt: new Date(Date.now() + appointment.daysFromNow * 24 * 60 * 60 * 1000),
        status: appointment.status,
        createdById,
        matchId: match.id,
      },
    });
  }

  const userIds: Record<string, string> = {
    admin: admin.id,
    mentor: mentor.id,
    startup0: startupProfiles[0].userId,
    startup5: startupProfiles[5].userId,
    investor0: investorProfiles[0].userId,
    investor3: investorProfiles[3].userId,
  };

  await seedAuditLogs(userIds, matchByPair, admin.id, mentor.id);

  console.log('dados de exemplo criados');
  console.log(`${startups.length} startups, ${investors.length} investidores, 1 mentor e 1 admin`);
  console.log(`${projects.length} projetos, ${matches.length} matches, ${messages.length} mensagens`);
  console.log(`${appointments.length} agendamentos e ${auditLogs.length} registros de auditoria`);
  console.log('contas: startup@porto.digital / investidor@porto.digital / admin@porto.digital');
  console.log(`senha: ${SENHA_DEMO}`);
  console.log(`mentor: ${mentor.email}`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
