import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateEventDto, UpdateEventDto, QueryEventsDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async createEvent(userId: string, createEventDto: CreateEventDto) {
    try {
      const eventData = {
        ...createEventDto,
        created_by: userId,
      };

      const { data, error } = await this.supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(
          `Failed to create event: ${error.message}`,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while creating the event',
      );
    }
  }

  async getEvents(query: QueryEventsDto) {
    try {
      let queryBuilder = this.supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      // Filter by date range
      if (query.start_date) {
        queryBuilder = queryBuilder.gte('event_date', query.start_date);
      }

      if (query.end_date) {
        queryBuilder = queryBuilder.lte('event_date', query.end_date);
      }

      // Filter by type
      if (query.type) {
        queryBuilder = queryBuilder.eq('type', query.type);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        throw new BadRequestException(
          `Failed to fetch events: ${error.message}`,
        );
      }

      return data || [];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while fetching events',
      );
    }
  }

  async getEventById(eventId: string) {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      return data;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while fetching the event',
      );
    }
  }

  async updateEvent(eventId: string, updateEventDto: UpdateEventDto) {
    try {
      // First check if event exists
      await this.getEventById(eventId);

      const { data, error } = await this.supabase
        .from('events')
        .update(updateEventDto)
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        throw new BadRequestException(
          `Failed to update event: ${error.message}`,
        );
      }

      return data;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while updating the event',
      );
    }
  }

  async deleteEvent(eventId: string) {
    try {
      // First check if event exists
      await this.getEventById(eventId);

      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        throw new BadRequestException(
          `Failed to delete event: ${error.message}`,
        );
      }

      return { message: 'Event deleted successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while deleting the event',
      );
    }
  }

  async getEventsByDateRange(startDate: string, endDate: string) {
    try {
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });

      if (error) {
        throw new BadRequestException(
          `Failed to fetch events: ${error.message}`,
        );
      }

      return data || [];
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An error occurred while fetching events',
      );
    }
  }
}
