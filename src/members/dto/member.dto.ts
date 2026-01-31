import { IsEmail, IsString, IsOptional, IsISO8601, IsNotEmpty, IsEnum, IsNumber, Min,MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMembersDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['newest', 'oldest', 'name_asc', 'name_desc'])
  sortBy?: 'newest' | 'oldest' | 'name_asc' | 'name_desc' = 'newest';

  @IsOptional()
  @IsEnum(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all' = 'all';
}

export class CreateMemberDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsISO8601()
  dateOfBirth: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class MemberSignupDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsISO8601()
  dateOfBirth: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class MemberSigninDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsISO8601()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive';
}

export class OAuthSigninDto {
  @IsString()
  provider: 'google' | 'github' | 'azure';

  @IsString()
  access_token: string;
}

export class MemberResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class AdminResetMemberPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
