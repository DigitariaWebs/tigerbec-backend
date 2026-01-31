import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { FundRequestsService } from './fund-requests.service';
import { CreateFundRequestDto } from './dto/create-fund-request.dto';
import { ReviewFundRequestDto } from './dto/review-fund-request.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('fund-requests')
export class FundRequestsController {
  constructor(private readonly fundRequestsService: FundRequestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async create(@CurrentUser() user: CurrentUserData, @Body() createDto: CreateFundRequestDto) {
    console.log('[FundRequestsController] Create request - userId:', user.id);
    console.log('[FundRequestsController] User data:', user);
    return this.fundRequestsService.create(user.id, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.fundRequestsService.findAll(user.id, user.role);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.fundRequestsService.getStats(user.id, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async findOne(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    return this.fundRequestsService.findOne(id, user.id, user.role);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async review(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() reviewDto: ReviewFundRequestDto,
  ) {
    return this.fundRequestsService.review(id, user.id, reviewDto);
  }
}
