export enum UserRole {
  MEMBER = 'member',
  ADMIN = 'admin',
}

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
}

export enum CarStatus {
  IN_STOCK = 'IN_STOCK',
  SOLD = 'SOLD',
}

export interface Member {
  user_id: string;
  name: string;
  date_of_birth: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  role: AdminRole;
  created_at: string;
  updated_at: string;
}

// Deprecated - keeping for backward compatibility
export interface Profile {
  id: string;
  full_name: string;
  date_of_birth: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Car {
  id: string;
  member_id: string;
  vin: string;
  make: string | null;
  model: string;
  year: number;
  purchase_price: string;
  purchase_date: string | null;
  status: CarStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: string;
}
