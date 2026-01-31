import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('member/kpis')
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async getMemberKPIs(
    @CurrentUser() user: CurrentUserData,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getMemberKPIs(user.id, query);
  }

  @Get('global/kpis')
  @Roles(UserRole.ADMIN)
  async getGlobalKPIs(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getGlobalKPIs(query);
  }

  @Get('global/member-profit')
  @Roles(UserRole.ADMIN)
  async getMemberProfitData(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getMemberProfitData(query);
  }

  @Get('global/age-bands')
  @Roles(UserRole.ADMIN)
  async getAgeBandAnalytics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getAgeBandAnalytics(query);
  }
}
