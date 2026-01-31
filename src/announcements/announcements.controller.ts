import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { UserRole } from '../types';
import { 
  CreateAnnouncementDto, 
  UpdateAnnouncementDto, 
  QueryAnnouncementsDto 
} from './dto/announcement.dto';

@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  // Public route for members to view active announcements
  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getActiveAnnouncements() {
    return this.announcementsService.getActiveAnnouncements();
  }

  // Super admin only routes
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async createAnnouncement(@Body() dto: CreateAnnouncementDto, @Request() req: any) {
    return this.announcementsService.createAnnouncement(dto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async getAnnouncements(@Query() query: QueryAnnouncementsDto) {
    return this.announcementsService.getAnnouncements(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async getAnnouncementById(@Param('id') id: string) {
    return this.announcementsService.getAnnouncementById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async updateAnnouncement(
    @Param('id') id: string, 
    @Body() dto: UpdateAnnouncementDto,
    @Request() req: any
  ) {
    return this.announcementsService.updateAnnouncement(id, dto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, SuperAdminGuard)
  @Roles(UserRole.ADMIN)
  async deleteAnnouncement(@Param('id') id: string, @Request() req: any) {
    return this.announcementsService.deleteAnnouncement(id, req.user.userId);
  }
}
