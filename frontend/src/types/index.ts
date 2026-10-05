export type UserRole = 'STARTUP' | 'INVESTOR' | 'MENTOR' | 'ADMIN';

export type MatchStatus = 'PENDENTE' | 'ACEITO' | 'RECUSADO';

export type AppointmentStatus = 'AGENDADO' | 'CONCLUIDO' | 'CANCELADO';

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
  needs?: string | null;
  pitchUrl?: string | null;
  logoUrl?: string | null;
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