import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('inventory/csv')
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async exportInventoryCSV(
    @CurrentUser() user: CurrentUserData,
    @Res() res: FastifyReply,
  ) {
    return this.reportsService.exportInventoryCSV(user.id, res);
  }

  @Get('sales-history/csv')
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async exportSalesHistoryCSV(
    @CurrentUser() user: CurrentUserData,
    @Res() res: FastifyReply,
  ) {
    return this.reportsService.exportSalesHistoryCSV(user.id, res);
  }

  @Get('analytics/csv')
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async exportMemberAnalyticsCSV(
    @CurrentUser() user: CurrentUserData,
    @Res() res: FastifyReply,
  ) {
    return this.reportsService.exportMemberAnalyticsCSV(user.id, res);
  }

  @Get('global-analytics/csv')
  @Roles(UserRole.ADMIN)
  async exportGlobalAnalyticsCSV(@Res() res: FastifyReply) {
    return this.reportsService.exportGlobalAnalyticsCSV(res);
  }

  @Get('member-report/pdf')
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async generateMemberReportPDF(
    @CurrentUser() user: CurrentUserData,
    @Res() res: FastifyReply,
  ) {
    return this.reportsService.generateMemberReportPDF(user.id, res);
  }
}
