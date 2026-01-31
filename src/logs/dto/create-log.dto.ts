import { IsString, IsUUID, IsOptional, IsObject, IsIn } from 'class-validator';

export class CreateLogDto {
  @IsOptional()
  @IsUUID()
  user_id?: string | null;

  @IsOptional()
  @IsString()
  user_email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'member', 'system', 'anonymous'])
  user_role?: string;

  @IsString()
  @IsIn([
    'auth_signup',
    'auth_signin',
    'auth_signin_failed',
    'auth_signout',
    'auth_password_reset',
    'member_created',
    'member_updated',
    'member_deleted',
    'car_added',
    'car_updated',
    'car_deleted',
    'car_sold',
    'admin_created',
    'admin_updated',
    'admin_deleted',
    'admin_password_reset',
    'announcement_created',
    'announcement_updated',
    'announcement_deleted',
  ])
  activity_type: string;

  @IsOptional()
  @IsString()
  @IsIn(['member', 'admin', 'car', 'car_sale', 'auth', 'announcement'])
  resource_type?: string;

  @IsOptional()
  @IsUUID()
  resource_id?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsString()
  request_method?: string;

  @IsOptional()
  @IsString()
  request_path?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  @IsIn(['success', 'failed', 'error'])
  status?: string;

  @IsOptional()
  @IsString()
  error_message?: string;
}
