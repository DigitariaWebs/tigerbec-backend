import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, QueryEventsDto } from './dto/event.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async createEvent(
    @CurrentUser() user: CurrentUserData,
    @Body() createEventDto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(user.id, createEventDto);
  }

  @Get()
  async getEvents(@Query() query: QueryEventsDto) {
    return this.eventsService.getEvents(query);
  }

  @Get(':id')
  async getEventById(@Param('id') eventId: string) {
    return this.eventsService.getEventById(eventId);
  }

  @Patch(':id')
  async updateEvent(
    @Param('id') eventId: string,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(eventId, updateEventDto);
  }

  @Delete(':id')
  async deleteEvent(@Param('id') eventId: string) {
    return this.eventsService.deleteEvent(eventId);
  }
}
