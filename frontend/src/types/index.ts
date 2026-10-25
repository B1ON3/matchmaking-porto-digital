export type UserRole = 'STARTUP' | 'INVESTOR' | 'MENTOR' | 'ADMIN';

export type MatchStatus = 'PENDENTE' | 'ACEITO' | 'RECUSADO';

export type AppointmentStatus = 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';

export type ProjectStatus = 'PLANEJADO' | 'EM_ANDAMENTO' | 'CONCLUIDO';

export interface Project {
  id: string;
  startupId: string;
  title: string;
  summary?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchDetails {
  setor: number;
  estagio: number;
  ticket: number;
  regiao: number;
}

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  role?: UserRole;
  createdAt?: string;
}

export interface StartupProfile {
  id: string;
  userId: string;
  companyName: string;
  sector: string;
  description: string;
  stage: string;
  city: string;
  state: string;
  website?: string | null;
  foundedAt?: string | null;
  needs?: string | null;
  pitchUrl?: string | null;
  logoUrl?: string | null;
  projects?: Project[];
  user?: PublicUser;
}

export interface InvestorProfile {
  id: string;
  userId: string;
  companyName?: string | null;
  sectorInterest: string;
  stageInterest: string;
  ticketMin: number;
  ticketMax: number;
  city?: string | null;
  state: string;
  bio?: string | null;
  user?: PublicUser;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  startupProfile?: StartupProfile | null;
  investorProfile?: InvestorProfile | null;
}

export interface Match {
  id: string;
  score: number;
  status: MatchStatus;
  reason?: string | null;
  details?: MatchDetails | null;
  createdAt: string;
  startup?: StartupProfile;
  investor?: InvestorProfile;
  startupUser?: { id: string; name: string; email: string };
  investorUser?: { id: string; name: string; email: string };
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; name: string; email: string };
  recipient: { id: string; name: string; email: string };
}

export interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt: string;
  status: AppointmentStatus;
  createdAt: string;
  matchId?: string | null;
  match?: Match | null;
  createdBy: { id: string; name: string; email: string };
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: UserRole } | null;
}

export interface Paginated {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface InsightFactor {
  key: string;
  label: string;
  value: number;
  weight: number;
}

export interface MarketPotential {
  score: number;
  label: 'Baixo' | 'Moderado' | 'Alto' | 'Muito alto';
  factors: InsightFactor[];
  disclaimer: string;
}

export interface StartupInsights {
  profile: StartupProfile & { user: PublicUser };
  projects: Project[];
  metrics: {
    matches: number;
    acceptedMatches: number;
    pendingMatches: number;
    messages: number;
    appointments: number;
    projects: number;
    investorsReached: number;
  };
  marketPotential: MarketPotential;
  viewerMatch: Match | null;
}

export interface InvestorInsights {
  profile: InvestorProfile & { user: PublicUser };
  metrics: {
    matches: number;
    acceptedMatches: number;
    pendingMatches: number;
    messages: number;
    appointments: number;
    startupsReached: number;
  };
  viewerMatch: Match | null;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  createdAt: string;
  user: string;
}

export interface AdminOverview {
  totals: {
    startups: number;
    investors: number;
    mentors: number;
    matches: number;
    accepted: number;
    pending: number;
    declined: number;
    messages: number;
    appointments: number;
    projects: number;
  };
  acceptanceRate: number;
  sectors: { sector: string; count: number; share: number }[];
  stages: { stage: string; count: number }[];
  topMatches: {
    id: string;
    score: number;
    status: MatchStatus;
    startup: string;
    investor: string;
  }[];
  recentAudit: AdminAuditEntry[];
  recentUsers: PublicUser[];
}
