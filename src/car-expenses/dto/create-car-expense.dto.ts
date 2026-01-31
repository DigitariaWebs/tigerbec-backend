import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateCarExpenseDto {
  @IsNotEmpty()
  @IsString()
  car_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsDateString()
  expense_date?: string;
}
