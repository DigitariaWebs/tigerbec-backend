import { Controller, Get, Patch, Delete, Post, Body, Param, UseGuards, Query, Put } from '@nestjs/common';
import { MembersService } from './members.service';
import { MemberStatsService } from './member-stats.service';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';
import { UpdateMemberDto, OAuthSigninDto, CreateMemberDto, QueryMembersDto, MemberResetPasswordDto, MemberSignupDto, MemberSigninDto, AdminResetMemberPasswordDto } from './dto/member.dto';
import { AdminAddFundsDto } from './dto/admin-add-funds.dto';
import { AdminRemoveFundsDto } from './dto/admin-remove-funds.dto';
import { AdminAddCarDto } from './dto/admin-add-car.dto';
import { UpdateCarDto } from '../cars/dto/car.dto';

@Controller('members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly memberStatsService: MemberStatsService,
  ) { }

  // Public member signup endpoint
  @Post('signup')
  async signup(@Body() dto: MemberSignupDto) {
    return this.membersService.signupMember(dto);
  }

  // Public member signin endpoint
  @Post('signin')
  async signin(@Body() dto: MemberSigninDto) {
    return this.membersService.signinMember(dto);
  }

  // Public member creation endpoint (for testing/admin use)
  @Post('create')
  async createMember(@Body() dto: CreateMemberDto) {
    return this.membersService.createMember(dto);
  }

  // Public password reset endpoint
  @Post('reset-password')
  async resetPassword(@Body() dto: MemberResetPasswordDto) {
    return this.membersService.resetPassword(dto);
  }

  // Get current member profile (member can access their own)
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async getMyProfile(@CurrentUser() user: CurrentUserData) {
    return this.membersService.getMemberById(user.id);
  }

  // Update current member profile (member can update their own)
  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async updateMyProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(user.id, dto);
  }

  // Update current member password (member can update their own password)
  @Patch('me/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async updateMyPassword(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.membersService.updatePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  // Delete current member account (member can delete their own account)
  @Delete('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async deleteMyAccount(@CurrentUser() user: CurrentUserData) {
    return this.membersService.deleteMember(user.id);
  }

  // Get member's own cars
  @Get('me/cars')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async getMyCars(@CurrentUser() user: CurrentUserData) {
    return this.membersService.getMemberCars(user.id);
  }

  // Get member's own stats
  @Get('me/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async getMyStats(@CurrentUser() user: CurrentUserData) {
    return this.memberStatsService.getMemberStatistics(user.id);
  }

  // Get member's dashboard data
  @Get('me/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async getMyDashboard(@CurrentUser() user: CurrentUserData) {
    return this.memberStatsService.getMemberStatistics(user.id);
  }

  // Admin-only endpoints
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllMembers(@Query() query: QueryMembersDto) {
    return this.membersService.getAllMembers(query);
  }

  @Get('stats/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMembersSummary() {
    return this.membersService.getMembersSummary();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMemberById(@Param('id') memberId: string) {
    return this.membersService.getMemberById(memberId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateMember(
    @Param('id') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.updateMember(memberId, dto);
  }

  @Put(':id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async resetMemberPassword(
    @Param('id') memberId: string,
    @Body() dto: AdminResetMemberPasswordDto,
  ) {
    return this.membersService.adminResetMemberPassword(memberId, dto.password);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteMember(@Param('id') memberId: string) {
    return this.membersService.deleteMember(memberId);
  }

  @Get(':id/cars')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMemberCars(@Param('id') memberId: string) {
    return this.membersService.getMemberCars(memberId);
  }

  @Get(':id/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getMemberStats(@Param('id') memberId: string) {
    return this.memberStatsService.getMemberStatistics(memberId);
  }

  // Admin directly adds funds to a member (auto-approved)
  @Post(':id/funds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminAddFunds(
    @CurrentUser() user: CurrentUserData,
    @Param('id') memberId: string,
    @Body() dto: AdminAddFundsDto,
  ) {
    return this.membersService.adminAddFunds(user.id, memberId, dto);
  }

  // Admin removes funds from a member account (auto-approved ledger adjustment)
  @Post(':id/funds/remove')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminRemoveFunds(
    @CurrentUser() user: CurrentUserData,
    @Param('id') memberId: string,
    @Body() dto: AdminRemoveFundsDto,
  ) {
    return this.membersService.adminRemoveFunds(user.id, memberId, dto);
  }

  // Admin directly adds a car to a member's inventory
  @Post(':id/cars')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminAddCar(
    @CurrentUser() user: CurrentUserData,
    @Param('id') memberId: string,
    @Body() dto: AdminAddCarDto,
  ) {
    return this.membersService.adminAddCar(user.id, memberId, dto);
  }

  // Admin updates a member's car
  @Patch(':id/cars/:carId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateCar(
    @CurrentUser() user: CurrentUserData,
    @Param('id') memberId: string,
    @Param('carId') carId: string,
    @Body() dto: UpdateCarDto,
  ) {
    return this.membersService.adminUpdateCar(user.id, memberId, carId, dto);
  }

  // Admin deletes a member's car
  @Delete(':id/cars/:carId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDeleteCar(
    @CurrentUser() user: CurrentUserData,
    @Param('id') memberId: string,
    @Param('carId') carId: string,
  ) {
    return this.membersService.adminDeleteCar(user.id, memberId, carId);
  }
}
