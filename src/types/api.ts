export interface ApiResponse<T = unknown[]> {
  data: T | null;
  error: string | null;
}

export interface User {
  id: number;
  name: string;
  role: string;
  is_admin: boolean;
  is_active: boolean;
  password_hash: string;
  created_at: string;
  created_by: string;
}

export interface Occupier {
  id: number;
  name: string;
  tier: string;
  depth: string | null;
  sector: string | null;
  city: string | null;
  sqft: number | null;
  lease_expiry: string | null;
  risk: string | null;
  owner: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string | null;
}

export interface Meeting {
  id: number;
  occupier_id: number;
  meeting_date: string | null;
  meeting_type: string | null;
  attendees: string | null;
  notes: string;
  actions: string | null;
  outcome: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  user_name: string;
  action: string;
  target: string | null;
  at: string;
}

export interface CreateUserPayload {
  name: string;
  password_hash: string;
  role?: string;
  is_admin?: boolean;
  is_active?: boolean;
  created_by?: string;
}

export interface PatchUserPayload {
  id: number;
  role?: string;
  is_admin?: boolean;
  is_active?: boolean;
  password_hash?: string;
}

export interface CreateOccupierPayload {
  name: string;
  tier: string;
  depth?: string;
  sector?: string;
  city?: string;
  sqft?: number;
  lease_expiry?: string;
  risk?: string;
  owner?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdateOccupierPayload extends CreateOccupierPayload {
  id: number;
  updated_by?: string;
}

export interface CreateMeetingPayload {
  occupier_id: number;
  notes: string;
  meeting_date?: string;
  meeting_type?: string;
  attendees?: string;
  actions?: string;
  outcome?: string;
  created_by?: string;
}

export interface CreateAuditPayload {
  user_name: string;
  action: string;
  target?: string;
}
