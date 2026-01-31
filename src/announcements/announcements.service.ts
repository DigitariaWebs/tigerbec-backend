import { Injectable, Inject, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateAnnouncementDto, UpdateAnnouncementDto, QueryAnnouncementsDto } from './dto/announcement.dto';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly logsService: LogsService,
  ) {}

  async createAnnouncement(dto: CreateAnnouncementDto, userId: string) {
    const { data: announcement, error } = await this.supabase
      .from('announcements')
      .insert({
        title: dto.title,
        content: dto.content,
        type: dto.type || 'general',
        priority: dto.priority || 'normal',
        is_active: dto.is_active !== undefined ? dto.is_active : true,
        expires_at: dto.expires_at || null,
        image_url: dto.image_url || null,
        created_by: userId,
      })
      .select(`
        *
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create announcement: ${error.message}`);
    }

    // Fetch creator info separately
    const { data: admin } = await this.supabase
      .from('admins')
      .select('user_id, name, email')
      .eq('user_id', userId)
      .single();

    const result = {
      ...announcement,
      created_by_user: admin ? { id: admin.user_id, name: admin.name, email: admin.email } : null,
    };

    // Log the announcement creation
    await this.logsService.createLog({
      user_id: userId,
      activity_type: 'announcement_created',
      resource_type: 'announcement',
      resource_id: announcement.id,
      status: 'success',
      metadata: { title: dto.title, type: dto.type },
    });

    return result;
  }

  async getAnnouncements(query: QueryAnnouncementsDto) {
    let queryBuilder = this.supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by active status
    if (query.activeOnly) {
      queryBuilder = queryBuilder.eq('is_active', true);
      
      // Also filter out expired announcements
      queryBuilder = queryBuilder.or('expires_at.is.null,expires_at.gte.' + new Date().toISOString());
    }

    // Filter by type
    if (query.type) {
      queryBuilder = queryBuilder.eq('type', query.type);
    }

    // Filter by priority
    if (query.priority) {
      queryBuilder = queryBuilder.eq('priority', query.priority);
    }

    const { data: announcements, error } = await queryBuilder;

    if (error) {
      throw new Error(`Failed to fetch announcements: ${error.message}`);
    }

    if (!announcements || announcements.length === 0) {
      return [];
    }

    // Fetch admin info for all announcements
    const creatorIds = [...new Set(announcements.map(a => a.created_by).filter(Boolean))];
    const { data: admins } = await this.supabase
      .from('admins')
      .select('user_id, name, email')
      .in('user_id', creatorIds);

    // Map admin info to announcements
    const adminMap = new Map(admins?.map(a => [a.user_id, a]) || []);
    const result = announcements.map(announcement => {
      const admin = announcement.created_by ? adminMap.get(announcement.created_by) : null;
      return {
        ...announcement,
        created_by_user: admin 
          ? { id: admin.user_id, name: admin.name, email: admin.email }
          : null,
      };
    });

    return result;
  }

  async getAnnouncementById(id: string) {
    const { data: announcement, error } = await this.supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }

    // Fetch creator info if exists
    if (announcement.created_by) {
      const { data: admin } = await this.supabase
        .from('admins')
        .select('user_id, name, email')
        .eq('user_id', announcement.created_by)
        .single();

      return {
        ...announcement,
        created_by_user: admin ? { id: admin.user_id, name: admin.name, email: admin.email } : null,
      };
    }

    return announcement;
  }

  async updateAnnouncement(id: string, dto: UpdateAnnouncementDto, userId: string) {
    // First check if announcement exists
    await this.getAnnouncementById(id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active;
    if (dto.expires_at !== undefined) updateData.expires_at = dto.expires_at;
    if (dto.image_url !== undefined) updateData.image_url = dto.image_url;

    const { data: announcement, error } = await this.supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update announcement: ${error.message}`);
    }

    // Fetch creator info if exists
    if (announcement.created_by) {
      const { data: admin } = await this.supabase
        .from('admins')
        .select('user_id, name, email')
        .eq('user_id', announcement.created_by)
        .single();

      const result = {
        ...announcement,
        created_by_user: admin ? { id: admin.user_id, name: admin.name, email: admin.email } : null,
      };

      // Log the announcement update
      await this.logsService.createLog({
        user_id: userId,
        activity_type: 'announcement_updated',
        resource_type: 'announcement',
        resource_id: id,
        status: 'success',
        metadata: { updates: updateData },
      });

      return result;
    }

    // Log even if no creator info
    await this.logsService.createLog({
      user_id: userId,
      activity_type: 'announcement_updated',
      resource_type: 'announcement',
      resource_id: id,
      status: 'success',
      metadata: { updates: updateData },
    });

    return announcement;
  }

  async deleteAnnouncement(id: string, userId: string) {
    // First check if announcement exists
    const announcement = await this.getAnnouncementById(id);

    const { error } = await this.supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete announcement: ${error.message}`);
    }

    // Log the announcement deletion
    await this.logsService.createLog({
      user_id: userId,
      activity_type: 'announcement_deleted',
      resource_type: 'announcement',
      resource_id: id,
      status: 'success',
      metadata: { title: announcement.title },
    });

    return { message: 'Announcement deleted successfully' };
  }

  async getActiveAnnouncements() {
    return this.getAnnouncements({ activeOnly: true });
  }
}
