import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryRequestsService } from './inventory-requests.service';
import { CreateInventoryRequestDto, ReviewInventoryRequestDto, InventoryRequestFilters } from './dto/inventory-request.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('inventory-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryRequestsController {
  constructor(private readonly inventoryRequestsService: InventoryRequestsService) {}

  /**
   * Member creates a new inventory request
   * POST /inventory-requests
   */
  @Post()
  @Roles(UserRole.MEMBER)
  async createRequest(@CurrentUser() user: CurrentUserData, @Body() dto: CreateInventoryRequestDto) {
    return this.inventoryRequestsService.createRequest(user.id, dto);
  }

  /**
   * Member gets their own requests
   * GET /inventory-requests/my-requests
   */
  @Get('my-requests')
  @Roles(UserRole.MEMBER)
  async getMyRequests(@CurrentUser() user: CurrentUserData, @Query() filters: InventoryRequestFilters) {
    return this.inventoryRequestsService.getMemberRequests(user.id, filters);
  }

  /**
   * Admin gets all requests
   * GET /inventory-requests
   */
  @Get()
  @Roles(UserRole.ADMIN)
  async getAllRequests(@Query() filters: InventoryRequestFilters) {
    return this.inventoryRequestsService.getAllRequests(filters);
  }

  /**
   * Get request statistics
   * GET /inventory-requests/stats
   */
  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getStats() {
    return this.inventoryRequestsService.getRequestStats();
  }

  /**
   * Get single request by ID
   * GET /inventory-requests/:id
   */
  @Get(':id')
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async getRequestById(@CurrentUser() user: CurrentUserData, @Param('id') id: string) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.inventoryRequestsService.getRequestById(id, user.id, isAdmin);
  }

  /**
   * Admin reviews a request (approve/reject)
   * PUT /inventory-requests/:id/review
   */
  @Put(':id/review')
  @Roles(UserRole.ADMIN)
  async reviewRequest(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: ReviewInventoryRequestDto,
  ) {
    return this.inventoryRequestsService.reviewRequest(id, user.id, dto);
  }
}
