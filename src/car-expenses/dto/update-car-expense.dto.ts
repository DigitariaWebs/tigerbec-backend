import { IsOptional, IsNumber, IsString, IsDateString, Min } from 'class-validator';

export class UpdateCarExpenseDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  expense_date?: string;
}
