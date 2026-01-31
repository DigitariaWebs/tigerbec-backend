import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { AdminRole } from '../../types';

export class AdminSignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  fullName: string;

  @IsString()
  phoneNumber: string;

  @IsEnum(AdminRole)
  @IsOptional()
  role?: AdminRole;
}

export class AdminSigninDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  new_password: string;

  @IsString()
  @IsOptional()
  current_password?: string;
}
