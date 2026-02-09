import { IsString, MinLength } from 'class-validator';

export class DeleteProjectDataDto {
  @IsString()
  @MinLength(8)
  password: string;
}

