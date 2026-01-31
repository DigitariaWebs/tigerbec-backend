import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuditLogData {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async createAuditLog(data: AuditLogData): Promise<void> {
    try {
      await this.supabase.from('audit_logs').insert({
        ...data,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  async getAuditLogs(filters?: {
    actor_id?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) {
    let query = this.supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.actor_id) {
      query = query.eq('actor_id', filters.actor_id);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error('Failed to fetch audit logs: ' + error.message);
    }

    return data || [];
  }
}
