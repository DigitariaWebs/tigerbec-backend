import { IsString, IsNumber, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreateInventoryRequestDto {
  @IsString()
  vin: string;

  @IsOptional()
  @IsString()
  make?: string;

  @IsString()
  model: string;

  @IsNumber()
  @Min(1900)
  @Max(2100)
  year: number;

  @IsNumber()
  @Min(0)
  purchase_price: number;

  @IsDateString()
  @IsOptional()
  purchase_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewInventoryRequestDto {
  @IsString()
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejection_reason?: string;
}

export class InventoryRequestFilters {
  @IsOptional()
  @IsString()
  status?: 'pending' | 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  member_id?: string;

  @IsOptional()
  @IsDateString()
  from_date?: string;

  @IsOptional()
  @IsDateString()
  to_date?: string;
}
