import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Patch, Request, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../types';
import { AdminSignupDto, AdminSigninDto, ResetPasswordDto } from './dto/admin-auth.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { UpdateSettingDto } from './dto/setting.dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditService: AuditService,
  ) {}

  // Public routes
  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async signup(@Body() dto: AdminSignupDto) {
    return this.adminService.signupAdmin(dto);
  }

  @Post('signin')
  async signin(@Body() dto: AdminSigninDto) {
    return this.adminService.signinAdmin(dto);
  }

  // Protected admin routes
  @Get('list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @Get('profile/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminById(@Param('id') id: string) {
    return this.adminService.getAdminById(id);
  }

  @Patch('profile/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto, @Request() req: any) {
    // Allow super admins to edit anyone, or allow admins to edit themselves
    const currentUserId = req.user.id;
    const isSuperAdmin = req.user.profile.role === 'super_admin';
    
    if (!isSuperAdmin && currentUserId !== id) {
      throw new ForbiddenException('You can only edit your own profile');
    }
    
    return this.adminService.updateAdmin(id, dto, req.user);
  }

  @Post('profile/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.adminService.resetPassword(id, dto);
  }

  @Delete('profile/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async deleteAdmin(@Param('id') id: string) {
    return this.adminService.deleteAdmin(id);
  }

  @Get('audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAuditLogs(
    @Query('actor_id') actor_id?: string,
    @Query('entity_type') entity_type?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAuditLogs({
      actor_id,
      entity_type,
      start_date,
      end_date,
      limit: limit ? parseInt(limit) : 100,
    });
  }

  // Settings routes
  @Get('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllSettings() {
    return this.adminService.getAllSettings();
  }

  // Public endpoint for franchise fee (no auth required)
  @Get('settings/public/franchise-fee')
  async getPublicFranchiseFee() {
    return this.adminService.getSetting('tctpro_franchise_fee');
  }

  @Get('settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getSetting(@Param('key') key: string) {
    return this.adminService.getSetting(key);
  }

  @Put('settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @Request() req: any,
  ) {
    return this.adminService.updateSetting(key, dto.setting_value, req.user);
  }
}
