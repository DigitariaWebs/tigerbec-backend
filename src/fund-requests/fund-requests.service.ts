import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { ReviewFundRequestDto } from './dto/review-fund-request.dto';

@Injectable()
export class FundRequestsService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async create(userId: string, createDto: CreateFundRequestDto) {
    console.log('[FundRequestsService] Creating fund request for userId:', userId);
    
    // Get member_id from user_id
    const { data: member, error: memberError } = await this.supabase
      .from('members')
      .select('user_id, name, email')
      .eq('user_id', userId)
      .single();

    console.log('[FundRequestsService] Member query result:', { member, memberError });

    if (memberError || !member) {
      throw new NotFoundException('Member not found');
    }

    const { data, error } = await this.supabase
      .from('fund_requests')
      .insert({
        member_id: member.user_id,
        amount: createDto.amount,
        notes: createDto.notes,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(userId: string, role: string) {
    let query = this.supabase
      .from('fund_requests')
      .select(`
        *,
        member:members!fund_requests_member_id_fkey(user_id, name, email),
        reviewer:admins!fund_requests_reviewed_by_fkey(user_id, name, email)
      `)
      .order('created_at', { ascending: false });

    // If member, only show their own requests
    if (role === 'member') {
      const { data: member } = await this.supabase
        .from('members')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      query = query.eq('member_id', member.user_id);
    }
    // If admin, show all requests (no filter needed)

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Transform the data to flatten member and reviewer info
    return data.map((request: any) => ({
      ...request,
      member_name: request.member?.name,
      member_email: request.member?.email,
      reviewer_name: request.reviewer?.name,
      reviewer_email: request.reviewer?.email,
    }));
  }

  async findOne(id: string, userId: string, role: string) {
    const { data, error } = await this.supabase
      .from('fund_requests')
      .select(`
        *,
        member:members!fund_requests_member_id_fkey(user_id, name, email),
        reviewer:admins!fund_requests_reviewed_by_fkey(user_id, name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Fund request not found');
    }

    // If member, verify they own this request
    if (role === 'member') {
      const { data: member } = await this.supabase
        .from('members')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!member || data.member_id !== member.user_id) {
        throw new ForbiddenException('Access denied');
      }
    }

    return {
      ...data,
      member_name: data.member?.name,
      member_email: data.member?.email,
      reviewer_name: data.reviewer?.name,
      reviewer_email: data.reviewer?.email,
    };
  }

  async review(id: string, userId: string, reviewDto: ReviewFundRequestDto) {
    // First, get the fund request
    const { data: fundRequest, error: fetchError } = await this.supabase
      .from('fund_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !fundRequest) {
      throw new NotFoundException('Fund request not found');
    }

    // Check if already reviewed
    if (fundRequest.status !== 'pending') {
      throw new BadRequestException('This request has already been reviewed');
    }

    // Verify admin exists
    const { data: admin, error: adminError } = await this.supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (adminError || !admin) {
      throw new ForbiddenException('Only admins can review fund requests');
    }

    // Update the fund request
    const updateData: any = {
      status: reviewDto.status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    };

    if (reviewDto.status === 'rejected' && reviewDto.rejection_reason) {
      updateData.rejection_reason = reviewDto.rejection_reason;
    }

    const { data, error } = await this.supabase
      .from('fund_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        member:members!fund_requests_member_id_fkey(user_id, name, email),
        reviewer:admins!fund_requests_reviewed_by_fkey(user_id, name, email)
      `)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      ...data,
      member_name: data.member?.name,
      member_email: data.member?.email,
      reviewer_name: data.reviewer?.name,
      reviewer_email: data.reviewer?.email,
    };
  }

  async getStats(userId: string, role: string) {
    let query = this.supabase.from('fund_requests').select('status, amount');

    // If member, only show their own stats
    if (role === 'member') {
      const { data: member } = await this.supabase
        .from('members')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!member) {
        throw new NotFoundException('Member not found');
      }

      query = query.eq('member_id', member.user_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(error.message);
    }

    const stats = {
      total: data.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      total_amount_requested: 0,
      total_amount_approved: 0,
    };

    data.forEach((request: any) => {
      stats.total_amount_requested += parseFloat(request.amount);

      if (request.status === 'pending') {
        stats.pending++;
      } else if (request.status === 'approved') {
        stats.approved++;
        stats.total_amount_approved += parseFloat(request.amount);
      } else if (request.status === 'rejected') {
        stats.rejected++;
      }
    });

    return stats;
  }
}
