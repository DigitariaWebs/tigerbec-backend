import { Injectable, Inject, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminSignupDto, AdminSigninDto } from './dto/admin-auth.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
  ) {}

  async signupAdmin(dto: AdminSignupDto) {
    const { email, password, fullName, phoneNumber, role } = dto;

    // Check if admin already exists
    const { data: existingAdmin } = await this.supabase
      .from('admins')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingAdmin) {
      throw new BadRequestException('Admin with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin record in admins table
    const { data: admin, error } = await this.supabase
      .from('admins')
      .insert({
        user_id: crypto.randomUUID(),
        email,
        name: fullName,
        phone: phoneNumber,
        password: hashedPassword,
        role: role || 'admin', // Default to 'admin' if not specified
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create admin: ' + error.message);
    }

    // Log admin creation - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: admin.user_id,
    //   userEmail: admin.email,
    //   userRole: 'admin',
    //   activityType: 'admin_created',
    //   resourceType: 'admin',
    //   resourceId: admin.user_id,
    //   status: 'success',
    //   metadata: { name: admin.name },
    // });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: admin.user_id,
      email: admin.email,
      role: 'admin',
      adminRole: admin.role,
    });

    const { password: _, ...adminWithoutPassword } = admin;
    return { 
      admin: adminWithoutPassword,
      access_token: token,
    };
  }

  async signinAdmin(dto: AdminSigninDto) {
    const { email, password } = dto;

    // Fetch admin from admins table
    const { data: admin, error } = await this.supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error || !admin) {
      // Log failed sign-in attempt
      await this.logsService.createLog({
        user_email: email,
        user_role: 'admin',
        activity_type: 'auth_signin_failed',
        resource_type: 'auth',
        status: 'failed',
        error_message: 'Invalid credentials - admin not found',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if admin is active
    if (!admin.is_active) {
      // Log failed sign-in attempt
      await this.logsService.createLog({
        user_email: email,
        user_role: 'admin',
        activity_type: 'auth_signin_failed',
        resource_type: 'auth',
        status: 'failed',
        error_message: 'Account is deactivated',
      });
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      // Log failed sign-in attempt
      await this.logsService.createLog({
        user_email: email,
        user_role: 'admin',
        activity_type: 'auth_signin_failed',
        resource_type: 'auth',
        status: 'failed',
        error_message: 'Invalid credentials - wrong password',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Log successful sign-in
    await this.logsService.createLog({
      user_id: admin.user_id,
      user_email: admin.email,
      user_role: 'admin',
      activity_type: 'auth_signin',
      resource_type: 'auth',
      status: 'success',
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: admin.user_id,
      email: admin.email,
      role: 'admin',
      adminRole: admin.role,
    });

    const { password: _, ...adminWithoutPassword } = admin;
    return {
      admin: adminWithoutPassword,
      access_token: token,
    };
  }

  async getAllAdmins() {
    const { data, error } = await this.supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to fetch admins: ' + error.message);
    }

    return data || [];
  }

  async getAdminById(adminId: string) {
    const { data, error } = await this.supabase
      .from('admins')
      .select('*')
      .eq('user_id', adminId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Admin not found');
    }

    return data;
  }

  async updateAdmin(adminId: string, dto: UpdateAdminDto, currentUser?: any) {
    const { name, email, phone, avatar_url, is_active } = dto;

    // Check if admin exists
    const existingAdmin = await this.getAdminById(adminId);

    // Only super admins can change the is_active status
    if (is_active !== undefined && currentUser && currentUser.profile.role !== 'super_admin') {
      throw new BadRequestException('Only super admins can change active status');
    }

    // Update admin record
    const { data, error } = await this.supabase
      .from('admins')
      .update({
        ...(name && { name }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(avatar_url !== undefined && { avatar_url }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', adminId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update admin: ' + error.message);
    }

    // Log admin update - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: adminId,
    //   userEmail: data.email,
    //   userRole: 'admin',
    //   activityType: 'admin_updated',
    //   resourceType: 'admin',
    //   resourceId: adminId,
    //   status: 'success',
    //   metadata: { updates: dto },
    // });

    // If email is being updated, also update in Supabase Auth
    if (email) {
      const { error: authError } = await this.supabase.auth.admin.updateUserById(adminId, {
        email,
      });

      if (authError) {
        console.error('Failed to update admin email in auth:', authError);
      }
    }

    return data;
  }

  async deleteAdmin(adminId: string) {
    // Check if admin exists
    const admin = await this.getAdminById(adminId);

    // Delete from admins table
    const { error } = await this.supabase
      .from('admins')
      .delete()
      .eq('user_id', adminId);

    if (error) {
      throw new BadRequestException('Failed to delete admin: ' + error.message);
    }

    // Log admin deletion - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: adminId,
    //   userEmail: admin.email,
    //   userRole: 'admin',
    //   activityType: 'admin_deleted',
    //   resourceType: 'admin',
    //   resourceId: adminId,
    //   status: 'success',
    // });

    // Delete from Supabase Auth
    const { error: authError } = await this.supabase.auth.admin.deleteUser(adminId);

    if (authError) {
      console.error('Failed to delete admin from auth:', authError);
    }

    return { message: 'Admin deleted successfully' };
  }

  async resetPassword(adminId: string, dto: { current_password?: string; new_password: string }) {
    const { current_password, new_password } = dto;

    // Fetch admin from admins table
    const { data: admin, error } = await this.supabase
      .from('admins')
      .select('*')
      .eq('user_id', adminId)
      .maybeSingle();

    if (error || !admin) {
      throw new NotFoundException('Admin not found');
    }

    // Verify current password only if provided
    if (current_password) {
      const isPasswordValid = await bcrypt.compare(current_password, admin.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // Hash new password
    const hashednew_password = await bcrypt.hash(new_password, 10);

    // Update password in database
    const { error: updateError } = await this.supabase
      .from('admins')
      .update({
        password: hashednew_password,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', admin.user_id);

    if (updateError) {
      throw new BadRequestException('Failed to reset password: ' + updateError.message);
    }

    // Log password reset - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: admin.user_id,
    //   userEmail: admin.email,
    //   userRole: 'admin',
    //   activityType: 'admin_password_reset',
    //   resourceType: 'admin',
    //   resourceId: admin.user_id,
    //   status: 'success',
    // });

    return { message: 'Password reset successfully' };
  }

  // ============================================
  // SETTINGS MANAGEMENT
  // ============================================

  async getSetting(settingKey: string) {
    const { data, error } = await this.supabase
      .from('app_settings')
      .select('*')
      .eq('setting_key', settingKey)
      .maybeSingle();

    if (error) {
      throw new BadRequestException('Failed to fetch setting: ' + error.message);
    }

    if (!data) {
      throw new NotFoundException(`Setting '${settingKey}' not found`);
    }

    return data;
  }

  async getAllSettings() {
    const { data, error } = await this.supabase
      .from('app_settings')
      .select('*')
      .order('setting_key', { ascending: true });

    if (error) {
      throw new BadRequestException('Failed to fetch settings: ' + error.message);
    }

    return data || [];
  }

  async updateSetting(settingKey: string, settingValue: string, currentUser: any) {
    // Verify the setting exists
    const { data: existing } = await this.supabase
      .from('app_settings')
      .select('*')
      .eq('setting_key', settingKey)
      .maybeSingle();

    if (!existing) {
      throw new NotFoundException(`Setting '${settingKey}' not found`);
    }

    // Update the setting
    const { data, error } = await this.supabase
      .from('app_settings')
      .update({
        setting_value: settingValue,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', settingKey)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update setting: ' + error.message);
    }

    // Log the setting change
    await this.logsService.createLog({
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_role: 'admin',
      activity_type: 'setting_updated',
      resource_type: 'app_settings',
      resource_id: settingKey,
      status: 'success',
      metadata: {
        old_value: existing.setting_value,
        new_value: settingValue,
      },
    });

    return data;
  }

  async deleteProjectData(currentUser: any, password: string) {
    // Verify admin identity and password before destructive action.
    const { data: admin, error: adminError } = await this.supabase
      .from('admins')
      .select('user_id, email, password')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (adminError || !admin) {
      throw new UnauthorizedException('Admin not found');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password || '');
    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    // Capture member IDs first so we can remove auth users too (when they exist).
    const { data: membersData, error: membersFetchError } = await this.supabase
      .from('members')
      .select('user_id');

    if (membersFetchError) {
      throw new BadRequestException('Failed to fetch members for cleanup: ' + membersFetchError.message);
    }

    const memberIds = (membersData || [])
      .map((member) => member.user_id)
      .filter(Boolean);

    const tableOrder: Array<{ table: string; key: 'id' | 'user_id' }> = [
      { table: 'tasks', key: 'id' },
      { table: 'car_sales', key: 'id' },
      { table: 'car_additional_expenses', key: 'id' },
      { table: 'fund_requests', key: 'id' },
      { table: 'car_inventory_requests', key: 'id' },
      { table: 'cars', key: 'id' },
      { table: 'events', key: 'id' },
      { table: 'announcements', key: 'id' },
      { table: 'audit_logs', key: 'id' },
      { table: 'activity_logs', key: 'id' },
      { table: 'members', key: 'user_id' },
    ];

    const deletedCounts: Record<string, number> = {};

    for (const item of tableOrder) {
      const { count, error } = await this.supabase
        .from(item.table)
        .delete({ count: 'exact' })
        .not(item.key, 'is', null);

      if (error) {
        // Skip missing relations to remain compatible with older deployments.
        const errorCode = (error as any).code;
        const errorMessage = (error as any).message || '';
        if (
          errorCode === '42P01' || // postgres undefined_table
          errorCode === 'PGRST205' || // postgrest table not found in schema cache
          (typeof errorMessage === 'string' &&
            errorMessage.includes('Could not find the table'))
        ) {
          deletedCounts[item.table] = 0;
          continue;
        }
        throw new BadRequestException(`Failed to clear '${item.table}': ${error.message}`);
      }

      deletedCounts[item.table] = count || 0;
    }

    // Best-effort cleanup of auth users that were tied to member IDs.
    // Ignore "not found" failures to keep the operation resilient.
    for (const memberId of memberIds) {
      try {
        await this.supabase.auth.admin.deleteUser(memberId);
      } catch (error) {
        // noop
      }
    }

    // Re-create an audit entry after the wipe.
    await this.logsService.createLog({
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_role: 'admin',
      activity_type: 'project_data_deleted',
      resource_type: 'system',
      status: 'success',
      metadata: {
        deleted_counts: deletedCounts,
      },
    });

    return {
      message: 'Project data deleted successfully',
      deleted_counts: deletedCounts,
    };
  }
}
