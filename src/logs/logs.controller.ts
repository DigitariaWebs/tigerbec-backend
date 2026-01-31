import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { FilterLogsDto } from './dto/filter-logs.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { UserRole } from '../types';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * Create a new activity log
   * POST /logs
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createLog(@Body() createLogDto: CreateLogDto) {
    await this.logsService.createLog(createLogDto);
    return {
      success: true,
      message: 'Activity log created successfully',
    };
  }

  /**
   * Get activity logs with filtering and pagination
   * GET /logs/activity
   */
  @Get('activity')
  @Roles(UserRole.ADMIN)
  async getLogs(@Query() filters: FilterLogsDto) {
    const result = await this.logsService.getLogs(filters);
    return {
      success: true,
      logs: result.data,
      total: result.total,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    };
  }

  /**
   * Get a single activity log by ID
   * GET /logs/:id
   */
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async getLogById(@Param('id') id: string) {
    const log = await this.logsService.getLogById(id);
    return {
      success: true,
      data: log,
    };
  }
}
