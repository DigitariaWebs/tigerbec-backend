import { Injectable, Inject, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UpdateMemberDto, QueryMembersDto, MemberResetPasswordDto } from './dto/member.dto';
import { AdminAddFundsDto } from './dto/admin-add-funds.dto';
import { AdminRemoveFundsDto } from './dto/admin-remove-funds.dto';
import { AdminAddCarDto } from './dto/admin-add-car.dto';
import { Member, CarStatus, Car } from '../types';
import { LogsService } from '../logs/logs.service';
import { UpdateCarDto } from '../cars/dto/car.dto';

@Injectable()
export class MembersService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
  ) { }

  async signupMember(dto: { email: string; password: string; name: string; dateOfBirth: string; phone?: string }) {
    // Check if member already exists
    const { data: existingMember } = await this.supabase
      .from('members')
      .select('user_id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingMember) {
      throw new BadRequestException('Member with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create member record
    const { data: member, error } = await this.supabase
      .from('members')
      .insert({
        user_id: crypto.randomUUID(),
        email: dto.email,
        name: dto.name,
        date_of_birth: dto.dateOfBirth,
        phone: dto.phone,
        password: hashedPassword,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create member: ' + error.message);
    }

    // Log member creation
    await this.logsService.createLog({
      user_id: member.user_id,
      user_email: member.email,
      user_role: 'member',
      activity_type: 'member_created',
      resource_type: 'member',
      resource_id: member.user_id,
      status: 'success',
      metadata: { name: member.name },
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: member.user_id,
      email: member.email,
      role: 'member',
    });

    const { password: _, ...memberWithoutPassword } = member;
    return {
      member: memberWithoutPassword,
      access_token: token,
    };
  }

  async signinMember(dto: { email: string; password: string }) {
    // Fetch member from members table
    const { data: member, error } = await this.supabase
      .from('members')
      .select('*')
      .eq('email', dto.email)
      .maybeSingle();

    if (error || !member) {
      // Log failed sign-in attempt
      await this.logsService.createLog({
        user_email: dto.email,
        user_role: 'member',
        activity_type: 'auth_signin_failed',
        resource_type: 'auth',
        status: 'failed',
        error_message: 'Invalid credentials - member not found',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if member has a password (may be OAuth-only)
    if (!member.password) {
      await this.logsService.createLog({
        user_email: dto.email,
        user_role: 'member',
        activity_type: 'auth_signin_failed',
        resource_type: 'auth',
        status: 'failed',
        error_message: 'No password set for this account',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, member.password);

    if (!isPasswordValid) {
      // Log failed sign-in attempt
      await this.logsService.createLog({
        user_email: dto.email,
        user_role: 'member',
        activity_type: 'auth_signin_failed',
        resource_type: 'auth',
        status: 'failed',
        error_message: 'Invalid credentials - wrong password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Log successful sign-in
    await this.logsService.createLog({
      user_id: member.user_id,
      user_email: member.email,
      user_role: 'member',
      activity_type: 'auth_signin',
      resource_type: 'auth',
      status: 'success',
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: member.user_id,
      email: member.email,
      role: 'member',
    });

    const { password: _, ...memberWithoutPassword } = member;
    return {
      member: memberWithoutPassword,
      access_token: token,
    };
  }

  async createMember(dto: { email: string; password: string; name: string; dateOfBirth: string; phone?: string }) {
    // Check if member already exists
    const { data: existingMember } = await this.supabase
      .from('members')
      .select('user_id')
      .eq('email', dto.email)
      .maybeSingle();

    if (existingMember) {
      throw new BadRequestException('Member with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create member record
    const { data: member, error } = await this.supabase
      .from('members')
      .insert({
        user_id: crypto.randomUUID(),
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        date_of_birth: dto.dateOfBirth,
        phone: dto.phone,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create member: ' + error.message);
    }

    // Log member creation
    await this.logsService.createLog({
      user_id: member.user_id,
      user_email: member.email,
      user_role: 'member',
      activity_type: 'member_created',
      resource_type: 'member',
      resource_id: member.user_id,
      status: 'success',
      metadata: { name: member.name },
    });

    return { member };
  }

  async signinWithOAuth(provider: 'google' | 'github' | 'azure', accessToken: string) {
    // Verify the OAuth token with Supabase
    const { data: authData, error: authError } = await this.supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      // Log failed OAuth sign-in - TODO: Implement logs module
      // await this.logsService.logAuthFailure({
      //   userEmail: 'unknown',
      //   userRole: 'member',
      //   errorMessage: `Invalid OAuth token for provider: ${provider}`,
      // });
      throw new UnauthorizedException('Invalid OAuth token');
    }

    // Check if member exists, if not create one
    const { data: member, error: memberError } = await this.supabase
      .from('members')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (!member) {
      // Create new member from OAuth data
      const { data: newMember, error: createError } = await this.supabase
        .from('members')
        .insert({
          user_id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0],
          avatar_url: authData.user.user_metadata?.avatar_url,
        })
        .select()
        .single();

      if (createError) {
        throw new BadRequestException('Failed to create member: ' + createError.message);
      }

      // Log member creation via OAuth - TODO: Implement logs module
      // await this.logsService.createActivityLog({
      //   userId: newMember.user_id,
      //   userEmail: newMember.email,
      //   userRole: 'member',
      //   activityType: 'member_created',
      //   resourceType: 'member',
      //   resourceId: newMember.user_id,
      //   status: 'success',
      //   metadata: { provider, oauth: true },
      // });

      // Log successful OAuth sign-in - TODO: Implement logs module
      // await this.logsService.logAuthSuccess({
      //   userId: newMember.user_id,
      //   userEmail: newMember.email,
      //   userRole: 'member',
      // });

      return {
        member: newMember,
        access_token: accessToken,
      };
    }

    // Log successful OAuth sign-in for existing member - TODO: Implement logs module
    // await this.logsService.logAuthSuccess({
    //   userId: member.user_id,
    //   userEmail: member.email,
    //   userRole: 'member',
    // });

    return {
      member,
      access_token: accessToken,
    };
  }

  async getAllMembers(query: QueryMembersDto) {
    const { page = 1, limit = 10, search, sortBy = 'newest', status } = query;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Build the query
    let supabaseQuery = this.supabase
      .from('members')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      supabaseQuery = supabaseQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,country.ilike.%${search}%`);
    }

    // Apply status filter
    if (status && status !== 'all') {
      supabaseQuery = supabaseQuery.eq('status', status);
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
        break;
      case 'oldest':
        supabaseQuery = supabaseQuery.order('created_at', { ascending: true });
        break;
      case 'name_asc':
        supabaseQuery = supabaseQuery.order('name', { ascending: true });
        break;
      case 'name_desc':
        supabaseQuery = supabaseQuery.order('name', { ascending: false });
        break;
    }

    // Apply pagination
    supabaseQuery = supabaseQuery.range(from, to);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw new BadRequestException('Failed to fetch members: ' + error.message);
    }

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        from: from + 1,
        to: Math.min(to + 1, count || 0),
      },
    };
  }

  async getMembersSummary() {
    // Get total members count
    const { count: totalCount, error: totalError } = await this.supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      throw new BadRequestException('Failed to fetch total members: ' + totalError.message);
    }

    // Get active members count
    const { count: activeCount, error: activeError } = await this.supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (activeError) {
      throw new BadRequestException('Failed to fetch active members: ' + activeError.message);
    }

    // Get recently active members (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { count: recentlyActiveCount, error: recentError } = await this.supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('updated_at', oneDayAgo.toISOString());

    if (recentError) {
      console.error('Failed to fetch recently active members:', recentError.message);
    }

    return {
      totalMembers: totalCount || 0,
      activeMembers: activeCount || 0,
      recentlyActive: recentlyActiveCount || 0,
    };
  }

  async getMemberById(memberId: string): Promise<Member> {
    const { data, error } = await this.supabase
      .from('members')
      .select('*')
      .eq('user_id', memberId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Member not found');
    }

    return data;
  }

  async updateMember(memberId: string, dto: UpdateMemberDto): Promise<Member> {
    // Check if member exists
    await this.getMemberById(memberId);

    const { name, email, phone, date_of_birth, avatar_url, company, country, status } = dto;

    // Update member record
    const { data, error } = await this.supabase
      .from('members')
      .update({
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(date_of_birth && { date_of_birth }),
        ...(avatar_url !== undefined && { avatar_url }),
        ...(company && { company }),
        ...(country && { country }),
        ...(status && { status }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', memberId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update member: ' + error.message);
    }

    // Log member update - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: data.user_id,
    //   userEmail: data.email,
    //   userRole: 'member',
    //   activityType: 'member_updated',
    //   resourceType: 'member',
    //   resourceId: data.user_id,
    //   status: 'success',
    //   metadata: { updates: dto },
    // });

    // If email is being updated, also update in Supabase Auth
    if (email) {
      const { error: authError } = await this.supabase.auth.admin.updateUserById(memberId, {
        email,
      });

      if (authError) {
        console.error('Failed to update member email in auth:', authError);
      }
    }

    return data;
  }

  async deleteMember(memberId: string) {
    // Check if member exists
    const member = await this.getMemberById(memberId);

    // Delete member's car sales first (to avoid foreign key constraints on cars)
    const { error: salesError } = await this.supabase
      .from('car_sales')
      .delete()
      .eq('member_id', memberId);

    if (salesError) {
      throw new BadRequestException('Failed to delete member sales: ' + salesError.message);
    }

    // Delete member's cars
    const { error: carsError } = await this.supabase
      .from('cars')
      .delete()
      .eq('member_id', memberId);

    if (carsError) {
      throw new BadRequestException('Failed to delete member cars: ' + carsError.message);
    }

    // Delete member's fund requests
    const { error: fundsError } = await this.supabase
      .from('fund_requests')
      .delete()
      .eq('member_id', memberId);

    if (fundsError) {
      throw new BadRequestException('Failed to delete member fund requests: ' + fundsError.message);
    }

    // Delete member's inventory requests
    const { error: invRequestsError } = await this.supabase
      .from('car_inventory_requests')
      .delete()
      .eq('member_id', memberId);

    if (invRequestsError) {
      throw new BadRequestException('Failed to delete member inventory requests: ' + invRequestsError.message);
    }

    // Delete from members table
    const { error } = await this.supabase
      .from('members')
      .delete()
      .eq('user_id', memberId);

    if (error) {
      throw new BadRequestException('Failed to delete member: ' + error.message);
    }

    // Log member deletion - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: member.user_id,
    //   userEmail: member.email,
    //   userRole: 'member',
    //   activityType: 'member_deleted',
    //   resourceType: 'member',
    //   resourceId: member.user_id,
    //   status: 'success',
    // });

    // Delete from Supabase Auth
    const { error: authError } = await this.supabase.auth.admin.deleteUser(memberId);

    if (authError) {
      console.error('Failed to delete member from auth:', authError);
    }

    return { message: 'Member deleted successfully' };
  }

  async getMemberCars(memberId: string) {
    // Check if member exists
    await this.getMemberById(memberId);

    const { data: cars, error } = await this.supabase
      .from('cars')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to fetch member cars: ' + error.message);
    }

    // For sold cars, fetch additional sales data including additional_expenses_snapshot
    const carsWithSalesData = await Promise.all(
      (cars || []).map(async (car) => {
        if (car.status === 'SOLD') {
          const { data: sale, error: saleError } = await this.supabase
            .from('car_sales')
            .select('additional_expenses_snapshot, net_profit, franchise_fee_amount')
            .eq('car_id', car.id)
            .single();

          if (!saleError && sale) {
            return {
              ...car,
              additional_expenses: parseFloat(sale.additional_expenses_snapshot?.toString() || '0'),
              net_profit: parseFloat(sale.net_profit?.toString() || '0'),
              franchise_fee: parseFloat(sale.franchise_fee_amount?.toString() || '0'),
            };
          }
        }
        return car;
      })
    );

    return carsWithSalesData;
  }

  async getMemberStats(memberId: string) {
    const member = await this.getMemberById(memberId);
    const cars = await this.getMemberCars(memberId);

    const { data: sales, error } = await this.supabase
      .from('car_sales')
      .select('*')
      .eq('member_id', memberId);

    if (error) {
      throw new BadRequestException('Failed to fetch member sales: ' + error.message);
    }

    const totalInvested = cars.reduce(
      (sum, car) => sum + parseFloat(car.purchase_price || '0'),
      0,
    );

    const totalProfit = (sales || []).reduce(
      (sum, sale) => sum + parseFloat(sale.profit || '0'),
      0,
    );

    const profitRatio = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;



    // Calculate Wallet Balance
    // Balance = (Total Approved Funds) + (Total Car Sales Revenue) - (Total Car Purchases Costs)
    // Note: This is a simplified "Cash" balance.

    // 1. Get Total Approved Funds
    const { data: approvedFunds } = await this.supabase
      .from('fund_requests')
      .select('amount, notes')
      .eq('member_id', memberId)
      .eq('status', 'approved');

    const totalFundsAdded = (approvedFunds || []).reduce(
      (sum, req: any) => {
        const amount = parseFloat(req.amount || '0');
        if (!Number.isFinite(amount)) return sum;
        const isWithdrawal =
          typeof req.notes === 'string' &&
          req.notes.trim().toUpperCase().startsWith('[WITHDRAWAL]');
        // Support either representation:
        // 1) negative amounts, or
        // 2) positive amounts marked with [WITHDRAWAL] in notes.
        if (amount < 0) return sum + amount;
        return sum + (isWithdrawal ? -amount : amount);
      },
      0
    );

    // 2. Get Total Sales Revenue (Sold Price)
    const totalSalesRevenue = (sales || []).reduce(
      (sum, sale) => sum + parseFloat(sale.sold_price || '0'),
      0
    );

    // 3. Get Total Purchase Cost (All cars ever bought)
    // We already have 'cars' fetched above.
    const totalPurchaseCost = cars.reduce(
      (sum, car) => sum + parseFloat(car.purchase_price || '0'),
      0
    );

    const walletBalance = totalFundsAdded + totalSalesRevenue - totalPurchaseCost;

    return {
      member,
      total_cars: cars.length,
      cars_sold: sales?.length || 0,
      total_invested: totalInvested.toFixed(2),
      total_profit: totalProfit.toFixed(2),
      profit_ratio: parseFloat(profitRatio.toFixed(2)),
      wallet_balance: parseFloat(walletBalance.toFixed(2)),
      financial: {
        totalInvestment: totalInvested,
        totalRevenue: totalSalesRevenue,
        totalGrossProfit: (sales || []).reduce((sum, s) => sum + (parseFloat(s.profit || '0')), 0),
        totalNetProfit: (sales || []).reduce((sum, s) => sum + (parseFloat(s.net_profit || '0')), 0),
        totalFranchiseFees: (sales || []).reduce((sum, s) => sum + (parseFloat(s.franchise_fee_amount || '0')), 0),
        totalAdditionalExpenses: (sales || []).reduce((sum, s) => sum + (parseFloat(s.additional_expenses_snapshot || '0')), 0),
        profitMargin: totalSalesRevenue > 0 ? (totalProfit / totalSalesRevenue) * 100 : 0,
        netProfitMargin: totalSalesRevenue > 0 ? ((sales || []).reduce((sum, s) => sum + parseFloat(s.net_profit || '0'), 0) / totalSalesRevenue) * 100 : 0,
      }
    };
  }

  async adminResetMemberPassword(memberId: string, newPassword: string): Promise<{ message: string }> {
    // First verify the member exists in our database
    const { data: member, error: memberError } = await this.supabase
      .from('members')
      .select('user_id, email, name')
      .eq('user_id', memberId)
      .single();

    if (memberError || !member) {
      throw new NotFoundException(`Member with ID ${memberId} not found in database`);
    }

    console.log('[adminResetMemberPassword] Attempting to reset password for member:', {
      memberId,
      memberEmail: member.email,
    });

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in the database
    const { error: updateError } = await this.supabase
      .from('members')
      .update({ password: hashedPassword })
      .eq('user_id', memberId);

    if (updateError) {
      throw new BadRequestException('Failed to reset password: ' + updateError.message);
    }

    // Log the password reset
    await this.logsService.createLog({
      user_id: memberId,
      user_email: member.email,
      user_role: 'member',
      activity_type: 'password_reset',
      resource_type: 'member',
      resource_id: memberId,
      status: 'success',
      metadata: { reset_by: 'admin' },
    });

    return { message: 'Password reset successfully' };
  }

  async resetPassword(dto: MemberResetPasswordDto) {
    const { email, currentPassword, newPassword } = dto;

    // Get member by email
    const { data: member, error } = await this.supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !member) {
      throw new NotFoundException('Member not found');
    }

    // For members using OAuth, they need to use Supabase Auth password reset
    // This method is for members who have set up password authentication
    try {
      // Use Supabase Auth to update password
      const { error: updateError } = await this.supabase.auth.admin.updateUserById(
        member.user_id,
        { password: newPassword }
      );

      if (updateError) {
        throw new BadRequestException('Failed to reset password: ' + updateError.message);
      }

      return { message: 'Password reset successfully' };
    } catch (error) {
      throw new BadRequestException('Failed to reset password. Please ensure you have password authentication enabled.');
    }
  }

  async updatePassword(memberId: string, currentPassword: string, newPassword: string) {
    // Fetch member from members table
    const { data: member, error } = await this.supabase
      .from('members')
      .select('*')
      .eq('user_id', memberId)
      .maybeSingle();

    if (error || !member) {
      throw new NotFoundException('Member not found');
    }

    // Check if member has a password
    if (!member.password) {
      throw new BadRequestException('No password set for this account');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, member.password);

    if (!isPasswordValid) {
      // Log failed password update attempt
      await this.logsService.createLog({
        user_id: memberId,
        user_email: member.email,
        user_role: 'member',
        activity_type: 'password_update_failed',
        resource_type: 'auth',
        status: 'failed',
        error_message: 'Invalid current password',
      });
      throw new BadRequestException('Invalid current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in members table
    const { error: updateError } = await this.supabase
      .from('members')
      .update({ password: hashedPassword })
      .eq('user_id', memberId);

    if (updateError) {
      throw new BadRequestException('Failed to update password: ' + updateError.message);
    }

    // Log successful password update
    await this.logsService.createLog({
      user_id: memberId,
      user_email: member.email,
      user_role: 'member',
      activity_type: 'password_updated',
      resource_type: 'auth',
      status: 'success',
    });

    return { message: 'Password updated successfully' };
  }

  private async calculateMemberAvailableBalance(memberId: string): Promise<number> {
    const { data: approvedFunds, error: fundsError } = await this.supabase
      .from('fund_requests')
      .select('amount, notes')
      .eq('member_id', memberId)
      .eq('status', 'approved');

    if (fundsError) {
      throw new BadRequestException('Failed to fetch member funds: ' + fundsError.message);
    }

    const totalFunds = (approvedFunds || []).reduce(
      (sum, req: any) => {
        const amount = parseFloat(req.amount || '0');
        if (!Number.isFinite(amount)) return sum;
        const isWithdrawal =
          typeof req.notes === 'string' &&
          req.notes.trim().toUpperCase().startsWith('[WITHDRAWAL]');
        if (amount < 0) return sum + amount;
        return sum + (isWithdrawal ? -amount : amount);
      },
      0,
    );

    const { data: cars, error: carsError } = await this.supabase
      .from('cars')
      .select('purchase_price')
      .eq('member_id', memberId);

    if (carsError) {
      throw new BadRequestException('Failed to fetch member cars: ' + carsError.message);
    }

    const totalPurchaseCost = (cars || []).reduce(
      (sum, car) => sum + parseFloat(car.purchase_price || '0'),
      0,
    );

    return Math.max(0, totalFunds - totalPurchaseCost);
  }

  /**
   * Admin directly adds funds to a member (auto-approved)
   */
  async adminAddFunds(adminId: string, memberId: string, dto: AdminAddFundsDto) {
    // Verify member exists
    const member = await this.getMemberById(memberId);

    // Get admin info
    const { data: admin, error: adminError } = await this.supabase
      .from('admins')
      .select('email')
      .eq('user_id', adminId)
      .single();

    if (adminError || !admin) {
      throw new BadRequestException('Admin not found');
    }

    // Create auto-approved fund entry
    const { data, error } = await this.supabase
      .from('fund_requests')
      .insert({
        member_id: memberId,
        amount: dto.amount,
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        notes: dto.notes,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to add funds: ' + error.message);
    }

    // Log the admin fund addition
    await this.logsService.createLog({
      user_id: null,
      user_email: admin.email,
      user_role: 'admin',
      activity_type: 'admin_fund_addition',
      resource_type: 'fund_request',
      resource_id: data.id,
      status: 'success',
      metadata: {
        admin_id: adminId,
        member_id: memberId,
        member_email: member.email,
        amount: dto.amount,
        notes: dto.notes,
      },
    });

    return data;
  }

  /**
   * Admin removes funds from a member account (auto-approved ledger adjustment)
   */
  async adminRemoveFunds(adminId: string, memberId: string, dto: AdminRemoveFundsDto) {
    // Verify member exists
    const member = await this.getMemberById(memberId);

    // Get admin info
    const { data: admin, error: adminError } = await this.supabase
      .from('admins')
      .select('email')
      .eq('user_id', adminId)
      .single();

    if (adminError || !admin) {
      throw new BadRequestException('Admin not found');
    }

    const availableBalance = await this.calculateMemberAvailableBalance(memberId);
    const requestedAmount = Number(dto.amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    if (requestedAmount > availableBalance) {
      throw new BadRequestException(
        `Insufficient available balance. Available: ${availableBalance.toFixed(2)}`,
      );
    }

    // Ledger adjustment without DDL: store approved positive amount marked as a withdrawal.
    // Some environments have a CHECK constraint that blocks negative amounts.
    const ledgerAmount = Math.abs(requestedAmount);
    if (!Number.isFinite(ledgerAmount) || ledgerAmount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    const notes = dto.notes?.trim()
      ? `[WITHDRAWAL] ${dto.notes.trim()}`
      : '[WITHDRAWAL]';
    const { data, error } = await this.supabase
      .from('fund_requests')
      .insert({
        member_id: memberId,
        amount: ledgerAmount,
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        notes,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to remove funds: ' + error.message);
    }

    const availableBalanceAfter = parseFloat(
      Math.max(0, availableBalance - Math.abs(dto.amount)).toFixed(2),
    );

    await this.logsService.createLog({
      user_id: null,
      user_email: admin.email,
      user_role: 'admin',
      activity_type: 'admin_fund_removal',
      resource_type: 'fund_request',
      resource_id: data.id,
      status: 'success',
      metadata: {
        admin_id: adminId,
        member_id: memberId,
        member_email: member.email,
        amount_removed: dto.amount,
        ledger_amount: -ledgerAmount,
        available_balance_before: availableBalance,
        available_balance_after: availableBalanceAfter,
        notes,
      },
    });

    return {
      ...data,
      amount_removed: dto.amount,
      available_balance_before: availableBalance,
      available_balance_after: availableBalanceAfter,
    };
  }

  async adminUpdateCar(adminId: string, memberId: string, carId: string, dto: UpdateCarDto): Promise<Car> {
    // Verify member exists
    await this.getMemberById(memberId);

    // Verify car exists and belongs to member
    const { data: car, error: carError } = await this.supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .eq('member_id', memberId)
      .single();

    if (carError || !car) {
      throw new NotFoundException('Car not found for this member');
    }

    // Update car
    const { data: updatedCar, error: updateError } = await this.supabase
      .from('cars')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', carId)
      .select()
      .single();

    if (updateError) {
      throw new BadRequestException('Failed to update car: ' + updateError.message);
    }

    // Get admin info for logging
    const { data: admin } = await this.supabase
      .from('admins')
      .select('email')
      .eq('user_id', adminId)
      .single();

    // Log update
    await this.logsService.createLog({
      user_id: null,
      user_email: admin?.email || 'admin',
      user_role: 'admin',
      activity_type: 'car_updated_by_admin',
      resource_type: 'car',
      resource_id: carId,
      status: 'success',
      metadata: {
        member_id: memberId,
        updates: dto
      }
    });

    return updatedCar;
  }

  async adminDeleteCar(adminId: string, memberId: string, carId: string): Promise<void> {
    // Verify member exists
    await this.getMemberById(memberId);

    // Verify car exists and belongs to member
    const { data: car, error: carError } = await this.supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .eq('member_id', memberId)
      .single();

    if (carError || !car) {
      throw new NotFoundException('Car not found for this member');
    }

    // Delete car
    const { error: deleteError } = await this.supabase
      .from('cars')
      .delete()
      .eq('id', carId);

    if (deleteError) {
      throw new BadRequestException('Failed to delete car: ' + deleteError.message);
    }

    // Get admin info for logging
    const { data: admin } = await this.supabase
      .from('admins')
      .select('email')
      .eq('user_id', adminId)
      .single();

    // Log deletion
    await this.logsService.createLog({
      user_id: null,
      user_email: admin?.email || 'admin',
      user_role: 'admin',
      activity_type: 'car_deleted_by_admin',
      resource_type: 'car',
      resource_id: carId,
      status: 'success',
      metadata: {
        member_id: memberId,
        vin: car.vin
      }
    });
  }

  /**
   * Admin directly adds a car to a member's inventory
   */
  async adminAddCar(adminId: string, memberId: string, dto: AdminAddCarDto) {
    // Verify member exists
    const member = await this.getMemberById(memberId);

    // Get admin info
    const { data: admin, error: adminError } = await this.supabase
      .from('admins')
      .select('email')
      .eq('user_id', adminId)
      .single();

    if (adminError || !admin) {
      throw new BadRequestException('Admin not found');
    }

    // Check VIN uniqueness for this member
    const { data: existingCar } = await this.supabase
      .from('cars')
      .select('id')
      .eq('member_id', memberId)
      .eq('vin', dto.vin)
      .single();

    if (existingCar) {
      throw new BadRequestException('A car with this VIN already exists in the member\'s inventory');
    }

    // Create the car
    const { data, error } = await this.supabase
      .from('cars')
      .insert({
        member_id: memberId,
        vin: dto.vin,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        purchase_price: dto.purchase_price,
        purchase_date: dto.purchase_date,
        status: CarStatus.IN_STOCK,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to add car: ' + error.message);
    }

    // Log the admin car addition
    await this.logsService.createLog({
      user_id: null,
      user_email: admin.email,
      user_role: 'admin',
      activity_type: 'admin_car_addition',
      resource_type: 'car',
      resource_id: data.id,
      status: 'success',
      metadata: {
        admin_id: adminId,
        member_id: memberId,
        member_email: member.email,
        vin: dto.vin,
        make: dto.make,
        model: dto.model,
        year: dto.year,
        purchase_price: dto.purchase_price,
      },
    });

    return data;
  }
}
