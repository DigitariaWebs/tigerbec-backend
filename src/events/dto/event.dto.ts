import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export enum EventType {
  WORK = 'work',
  PERSONAL = 'personal',
  FAMILY = 'family',
  HOLIDAY = 'holiday',
  BIRTHDAY = 'birthday',
  TRAVEL = 'travel',
  REMINDER = 'reminder',
  DEADLINE = 'deadline',
}

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  event_date: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attendees?: string[];

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  event_date?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attendees?: string[];

  @IsString()
  @IsOptional()
  color?: string;
}

export class QueryEventsDto {
  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;
}
