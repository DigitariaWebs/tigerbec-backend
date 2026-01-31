import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateInventoryRequestDto, ReviewInventoryRequestDto, InventoryRequestFilters } from './dto/inventory-request.dto';
import { LogsService } from '../logs/logs.service';

export interface InventoryRequest {
  id: string;
  member_id: string;
  vin: string;
  make?: string;
  model: string;
  year: number;
  purchase_price: number;
  purchase_date?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  member_name?: string;
  member_email?: string;
  reviewer_name?: string;
}

@Injectable()
export class InventoryRequestsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabaseService: SupabaseClient,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Member creates a new inventory request
   */
  async createRequest(memberId: string, dto: CreateInventoryRequestDto): Promise<InventoryRequest> {
    // Check if member exists
    const { data: member } = await this.supabaseService
      .from('members')
      .select('email')
      .eq('user_id', memberId)
      .single();

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Create the request
    const { data, error } = await this.supabaseService
      .from('car_inventory_requests')
      .insert({
        member_id: memberId,
        vin: dto.vin,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        purchase_price: dto.purchase_price,
        purchase_date: dto.purchase_date,
        notes: dto.notes,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create inventory request: ' + error.message);
    }

    // Log the request creation
    await this.logsService.createLog({
      user_id: memberId,
      user_email: member.email,
      user_role: 'member',
      activity_type: 'inventory_request_created',
      resource_type: 'inventory_request',
      resource_id: data.id,
      status: 'success',
      metadata: {
        vin: data.vin,
        make: data.make,
        model: data.model,
        year: data.year,
        purchase_price: data.purchase_price,
      },
    });

    return data;
  }

  /**
   * Get member's own requests
   */
  async getMemberRequests(memberId: string, filters?: InventoryRequestFilters): Promise<InventoryRequest[]> {
    let query = this.supabaseService
      .from('car_inventory_requests_detailed')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.from_date) {
      query = query.gte('created_at', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('created_at', filters.to_date);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch requests: ' + error.message);
    }

    return data || [];
  }

  /**
   * Get all requests (admin only)
   */
  async getAllRequests(filters?: InventoryRequestFilters): Promise<InventoryRequest[]> {
    let query = this.supabaseService
      .from('car_inventory_requests_detailed')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.member_id) {
      query = query.eq('member_id', filters.member_id);
    }

    if (filters?.from_date) {
      query = query.gte('created_at', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('created_at', filters.to_date);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch requests: ' + error.message);
    }

    return data || [];
  }

  /**
   * Get single request by ID
   */
  async getRequestById(requestId: string, userId: string, isAdmin: boolean): Promise<InventoryRequest> {
    const { data, error } = await this.supabaseService
      .from('car_inventory_requests_detailed')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Request not found');
    }

    // Check permissions
    if (!isAdmin && data.member_id !== userId) {
      throw new ForbiddenException('You do not have permission to view this request');
    }

    return data;
  }

  /**
   * Admin reviews a request (approve/reject)
   */
  async reviewRequest(
    requestId: string,
    adminId: string,
    dto: ReviewInventoryRequestDto,
  ): Promise<InventoryRequest> {
    // Get admin details
    const { data: admin } = await this.supabaseService
      .from('admins')
      .select('email')
      .eq('user_id', adminId)
      .single();

    if (!admin) {
      throw new ForbiddenException('Admin not found');
    }

    // Get the request
    const { data: request, error: fetchError } = await this.supabaseService
      .from('car_inventory_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request has already been reviewed');
    }

    // Update the request
    const updateData: any = {
      status: dto.status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    };

    if (dto.status === 'rejected' && dto.rejection_reason) {
      updateData.rejection_reason = dto.rejection_reason;
    }

    const { data, error } = await this.supabaseService
      .from('car_inventory_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update request: ' + error.message);
    }

    // Get member email for logging
    const { data: member } = await this.supabaseService
      .from('members')
      .select('email')
      .eq('user_id', request.member_id)
      .single();

    // Log the review
    // Note: user_id may be null if admin not in auth.users table
    await this.logsService.createLog({
      user_id: null, // Set to null to avoid FK constraint issues
      user_email: admin.email,
      user_role: 'admin',
      activity_type: `inventory_request_${dto.status}`,
      resource_type: 'inventory_request',
      resource_id: requestId,
      status: 'success',
      metadata: {
        admin_id: adminId, // Store admin ID in metadata instead
        member_id: request.member_id,
        member_email: member?.email,
        vin: request.vin,
        make: request.make,
        model: request.model,
        year: request.year,
        rejection_reason: dto.rejection_reason,
      },
    });

    return data;
  }

  /**
   * Get request statistics
   */
  async getRequestStats(): Promise<{
    total_requests: number;
    pending_requests: number;
    approved_requests: number;
    rejected_requests: number;
  }> {
    const { data, error } = await this.supabaseService
      .from('car_inventory_requests')
      .select('status');

    if (error) {
      throw new BadRequestException('Failed to fetch stats: ' + error.message);
    }

    const stats = {
      total_requests: data.length,
      pending_requests: data.filter(r => r.status === 'pending').length,
      approved_requests: data.filter(r => r.status === 'approved').length,
      rejected_requests: data.filter(r => r.status === 'rejected').length,
    };

    return stats;
  }
}
