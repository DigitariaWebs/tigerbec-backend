import { IsOptional, IsString, IsUUID, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterLogsDto {
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @IsString()
  user_email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'member', 'system', 'anonymous'])
  user_role?: string;

  @IsOptional()
  @IsString()
  activity_type?: string;

  @IsOptional()
  @IsString()
  resource_type?: string;

  @IsOptional()
  @IsUUID()
  resource_id?: string;

  @IsOptional()
  @IsString()
  @IsIn(['success', 'failed', 'error'])
  status?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
