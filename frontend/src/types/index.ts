export type UserRole = 'STARTUP' | 'INVESTOR' | 'MENTOR' | 'ADMIN';

export type UserStatus = 'ATIVO' | 'SUSPENSO' | 'EXCLUIDO';

export type ConsentType = 'TERMOS_USO' | 'DADOS_PESSOAIS' | 'COMUNICACOES';

export type ConsentStatus = 'CONCEDIDO' | 'REVOGADO';

export type MatchStatus = 'PENDENTE' | 'ACEITO' | 'RECUSADO';

export type AppointmentStatus = 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';

export type ProjectStatus = 'PLANEJADO' | 'EM_ANDAMENTO' | 'CONCLUIDO';

export type TrustStatus = 'NAO_AVALIADO' | 'CONFIAVEL' | 'SUSPEITO' | 'GOLPE';

export type VerificationStatus = 'NAO_SOLICITADA' | 'PENDENTE' | 'APROVADA' | 'RECUSADA';

export type TicketCategory = 'GOLPE' | 'PERFIL_FALSO' | 'ASSEDIO' | 'SPAM' | 'DADOS_INCORRETOS' | 'SUPORTE' | 'OUTRO';

export type TicketStatus = 'ABERTO' | 'EM_ANALISE' | 'AGUARDANDO_USUARIO' | 'RESOLVIDO' | 'ARQUIVADO';

export type TicketPriority = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export type TicketActionType =
  | 'ACESSO_AUTORIZADO'
  | 'OBSERVACAO'
  | 'USUARIO_SUSPENSO'
  | 'USUARIO_REATIVADO'
  | 'PERFIL_OCULTADO'
  | 'PERFIL_RESTAURADO'
  | 'GOLPE_CONFIRMADO'
  | 'GOLPE_DESCARTADO'
  | 'SUSPEITA_MARCADA'
  | 'SUSPEITA_REMOVIDA';

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
  verificacao: number;
}

export type CompatibilityStatus = 'ATENDE' | 'PARCIAL' | 'NAO_ATENDE';

export type CompatibilityDimensionKey = keyof MatchDetails;

export interface CompatibilityDimension {
  key: CompatibilityDimensionKey;
  label: string;
  weight: number;
  points: number;
  status: CompatibilityStatus;
  evidence: string;
}

export interface CompatibilityParty {
  id: string;
  name: string;
  contactName: string;
  sector: string;
  stage: string;
  city: string;
  state: string;
  description?: string | null;
  logoUrl?: string | null;
  ticketMin?: number | null;
  ticketMax?: number | null;
}

export interface MatchCompatibility {
  matchId: string;
  score: number;
  reason: string;
  dimensions: CompatibilityDimension[];
  summary: {
    strengths: string[];
    attention: string[];
  };
  startup: CompatibilityParty;
  investor: CompatibilityParty;
}

export interface PublicUser {
  id: string;
  name: string;
  email?: string;
  role?: UserRole;
  createdAt?: string;
  verifiedAt?: string | null;
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
  businessModel?: string | null;
  teamSize?: number | null;
  revenue?: string | null;
  linkedin?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  legalName?: string | null;
  document?: string | null;
  targetMarket?: string | null;
  traction?: string | null;
  roundTarget?: number | null;
  useOfFunds?: string | null;
  competitors?: string | null;
  accelerators?: string | null;
  awards?: string | null;
  instagram?: string | null;
  hiddenAt?: string | null;
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
  investorType?: string | null;
  website?: string | null;
  linkedin?: string | null;
  investmentThesis?: string | null;
  preferredGeography?: string | null;
  portfolioUrl?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  experience?: string | null;
  document?: string | null;
  instagram?: string | null;
  dealsPerYear?: number | null;
  horizon?: string | null;
  leadsRound?: boolean | null;
  boardSeat?: boolean | null;
  valueAdd?: string | null;
  hiddenAt?: string | null;
  user?: PublicUser;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: UserStatus;
  trustStatus?: TrustStatus;
  verifiedAt?: string | null;
  createdAt?: string;
  lastLoginAt?: string;
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

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
}

export interface ConversationMatch {
  id: string;
  status: MatchStatus;
  score: number;
  reason: string | null;
}

export interface ConversationSummary {
  usuario: { id: string; name: string; email: string };
  ultimaMensagem: Message;
  naoLidas: number;
  match: ConversationMatch | null;
}

export interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  createdAt: string;
  matchId?: string | null;
  match?: Match | null;
  createdBy: { id: string; name: string; email: string };
}

export interface AppointmentConflictPreview {
  conflict: boolean;
  conflitos: {
    id: string;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
  }[];
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
  recentAudit: AdminAuditEntry[];
  recentUsers: PublicUser[];
  tickets: {
    byStatus: Partial<Record<TicketStatus, number>>;
    open: number;
    inReview: number;
    waitingUser: number;
    resolved: number;
    archived: number;
  };
  recentTickets: {
    id: string;
    protocol: string;
    category: TicketCategory;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    createdAt: string;
    reporter?: { name: string } | null;
    targetUser?: { name: string } | null;
    naoLidas?: number;
  }[];
  verifications: {
    pending: number;
    approved: number;
    rejected: number;
    verifiedProfiles: number;
  };
}

export interface ProfileVerification {
  id: string;
  status: Exclude<VerificationStatus, 'NAO_SOLICITADA'>;
  legalName?: string | null;
  document?: string | null;
  website?: string | null;
  linkedin?: string | null;
  pitchUrl?: string | null;
  evidence: string;
  extraLinks?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewNote?: string | null;
}

export interface MyVerification {
  verificado: boolean;
  verificadoEm?: string | null;
  status: VerificationStatus;
  podeSolicitar: boolean;
  solicitacao: ProfileVerification | null;
}

export interface VerificationRequestInput {
  legalName?: string;
  document?: string;
  website?: string;
  linkedin?: string;
  pitchUrl?: string;
  evidence: string;
  extraLinks?: string;
}

export interface AdminVerificationUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  trustStatus: TrustStatus;
  verificado: boolean;
  criadoEm: string;
  startup?: Pick<
    StartupProfile,
    | 'id'
    | 'companyName'
    | 'sector'
    | 'stage'
    | 'city'
    | 'state'
    | 'website'
    | 'linkedin'
    | 'pitchUrl'
    | 'description'
    | 'hiddenAt'
  > | null;
  investidor?: Pick<
    InvestorProfile,
    | 'id'
    | 'companyName'
    | 'sectorInterest'
    | 'stageInterest'
    | 'ticketMin'
    | 'ticketMax'
    | 'city'
    | 'state'
    | 'website'
    | 'linkedin'
    | 'portfolioUrl'
    | 'bio'
    | 'hiddenAt'
  > | null;
}

export interface AdminVerification extends ProfileVerification {
  usuario: AdminVerificationUser;
  revisadoPor?: { id: string; name: string } | null;
}

export interface AdminVerificationsPage extends Paginated {
  contadores: {
    pendentes: number;
    aprovadas: number;
    recusadas: number;
  };
  pedidos: AdminVerification[];
}

export interface TicketUser extends PublicUser {
  role: UserRole;
  status: UserStatus;
  trustStatus: TrustStatus;
  trustReason?: string | null;
  trustUpdatedAt?: string | null;
  lastLoginAt?: string | null;
  suspendedAt?: string | null;
  moderationReason?: string | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
  sender: { id: string; name: string; role: UserRole };
}

export interface TicketAction {
  id: string;
  ticketId: string;
  adminId: string;
  action: TicketActionType;
  notes?: string | null;
  createdAt: string;
  admin: { id: string; name: string };
}

export interface TicketSummary {
  id: string;
  protocol: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  resolution?: string | null;
  reporterId: string;
  targetUserId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: TicketUser | null;
  targetUser?: TicketUser | null;
  messages: TicketMessage[];
  naoLidas?: number;
}

export interface TicketContextMatch {
  id: string;
  score: number;
  status: MatchStatus;
  createdAt: string;
  startup: string;
  investor: string;
}

export interface TicketContextAppointment {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  createdAt: string;
  createdBy: string;
  match: {
    id: string;
    score: number;
    status: MatchStatus;
    startup: string;
    investor: string;
  } | null;
}

export interface TicketContext {
  alvo: TicketUser & {
    createdAt: string;
    startupProfile?: StartupProfile | null;
    investorProfile?: InvestorProfile | null;
  };
  matches: TicketContextMatch[];
  appointments: TicketContextAppointment[];
}

export interface Ticket extends TicketSummary {
  reporter: TicketUser;
  targetUser?: TicketUser | null;
  actions?: TicketAction[];
  contexto?: TicketContext | null;
}

export interface AdminTicketsPage extends Paginated {
  resumo: {
    abertos: number;
    emAnalise: number;
    aguardandoUsuario: number;
    resolvidos: number;
    arquivados: number;
  };
  chamados: TicketSummary[];
}

export interface AdminUserProfile {
  id: string;
  companyName?: string | null;
  sector?: string | null;
  sectorInterest?: string | null;
  city?: string | null;
  state?: string | null;
  hiddenAt?: string | null;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  trustStatus: TrustStatus;
  trustReason?: string | null;
  trustUpdatedAt?: string | null;
  lastLoginAt?: string | null;
  suspendedAt?: string | null;
  moderationReason?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
  startupProfile?: AdminUserProfile | null;
  investorProfile?: AdminUserProfile | null;
}

export interface AdminUsersPage {
  total: number;
  pagina: number;
  porPagina: number;
  users: AdminUser[];
}

export interface AdminMetricsByRole {
  role: UserRole;
  count: number;
}

export interface AdminMetricsTopItem {
  label: string;
  count: number;
  share: number;
}

export interface AdminMetricsFunnelStep {
  key: string;
  label: string;
  count: number;
  conversionFromPrevious: number;
}

export interface AdminMetricsSeriesPoint {
  bucket: string;
  users: number;
  matches: number;
  messages: number;
  appointments: number;
}

export interface AdminMetrics {
  range: {
    from: string;
    to: string;
    days: number;
    granularity: 'day' | 'week';
  };
  users: {
    newTotal: number;
    activeTotal: number;
    newByRole: AdminMetricsByRole[];
    activeByRole: AdminMetricsByRole[];
  };
  matches: {
    created: number;
    accepted: number;
    declined: number;
    pending: number;
  };
  messages: {
    sent: number;
  };
  appointments: {
    created: number;
    scheduled: number;
    completed: number;
    cancelled: number;
  };
  funnel: AdminMetricsFunnelStep[];
  topSectors: AdminMetricsTopItem[];
  topCities: AdminMetricsTopItem[];
  topStages: AdminMetricsTopItem[];
  series: AdminMetricsSeriesPoint[];
}

export interface PrivacyPolicySection {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  items?: string[];
}

export interface PrivacyPolicy {
  version: string;
  effectiveAt: string;
  reviewDueAt: string;
  title: string;
  controller: string;
  contact: string;
  summary: string;
  sections: PrivacyPolicySection[];
  hash: string;
}

export interface ConsentSummary {
  type: ConsentType;
  status: ConsentStatus;
  version: string;
  acceptedAt: string;
  revokedAt: string | null;
}

export interface ConsentRecord {
  id: string;
  type: ConsentType;
  granted: boolean;
  policyVersion: string;
  policyHash: string;
  acceptedAt: string;
  revokedAt: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface PrivacyOverview {
  policy: {
    version: string;
    hash: string;
    effectiveAt: string;
    reviewDueAt: string;
    title: string;
    contact: string;
  };
  account: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    createdAt: string;
    lastLoginAt: string | null;
  };
  consents: ConsentSummary[];
  history: ConsentRecord[];
  dataSummary: {
    messages: number;
    appointments: number;
    matches: number;
    auditEvents: number;
  };
}
