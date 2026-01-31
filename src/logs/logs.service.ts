import { Injectable, Inject, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateLogDto } from './dto/create-log.dto';
import { FilterLogsDto } from './dto/filter-logs.dto';

export interface ActivityLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  activity_type: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  metadata?: Record<string, any>;
  status?: string;
  error_message?: string;
  created_at: string;
}

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  /**
   * Create a new activity log entry
   */
  async createLog(createLogDto: CreateLogDto): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('activity_logs')
        .insert(createLogDto);

      if (error) {
        this.logger.error(`Failed to create activity log: ${error.message}`);
        // Don't throw - logging failures shouldn't break the main operation
      }
    } catch (error) {
      this.logger.error('Unexpected error creating activity log:', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  }

  /**
   * Get activity logs with filtering and pagination
   */
  async getLogs(
    filters: FilterLogsDto,
  ): Promise<{ data: ActivityLog[]; total: number }> {
    try {
      // Build the query
      let query = this.supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.user_email) {
        query = query.ilike('user_email', `%${filters.user_email}%`);
      }
      if (filters.user_role) {
        query = query.eq('user_role', filters.user_role);
      }
      if (filters.activity_type) {
        query = query.eq('activity_type', filters.activity_type);
      }
      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type);
      }
      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        this.logger.error(`Failed to fetch activity logs: ${error.message}`);
        throw new Error(`Failed to fetch activity logs: ${error.message}`);
      }

      return {
        data: data || [],
        total: count || 0,
      };
    } catch (error) {
      this.logger.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  /**
   * Get a single activity log by ID
   */
  async getLogById(id: string): Promise<ActivityLog | null> {
    try {
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        this.logger.error(`Failed to fetch activity log: ${error.message}`);
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error('Error fetching activity log:', error);
      return null;
    }
  }

  /**
   * Helper method to log user authentication events
   */
  async logAuth(data: {
    user_id?: string;
    user_email?: string;
    user_role?: string;
    activity_type: string;
    ip_address?: string;
    user_agent?: string;
    status?: string;
    error_message?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.createLog({
      ...data,
      resource_type: 'auth',
    });
  }

  /**
   * Helper method to log resource operations (CRUD)
   */
  async logResourceOperation(data: {
    user_id?: string;
    user_email?: string;
    user_role?: string;
    activity_type: string;
    resource_type: string;
    resource_id?: string;
    request_method?: string;
    request_path?: string;
    metadata?: Record<string, any>;
    status?: string;
    error_message?: string;
  }): Promise<void> {
    await this.createLog(data);
  }
}
