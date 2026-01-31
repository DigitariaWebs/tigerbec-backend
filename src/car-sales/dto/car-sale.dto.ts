import { IsUUID, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateCarSaleDto {
  @IsUUID()
  car_id: string;

  @IsUUID()
  member_id: string;

  @IsNumber()
  @Min(0)
  sold_price: number;

  @IsDateString()
  @IsOptional()
  sold_date?: string;
}

export class CarSaleResponseDto {
  id: string;
  car_id: string;
  member_id: string;
  sold_price: number;
  sold_date: string;
  vin_snapshot: string;
  make_snapshot: string | null;
  model_snapshot: string;
  year_snapshot: number;
  purchase_price_snapshot: number;
  purchase_date_snapshot: string;
  additional_expenses_snapshot: number;
  profit: number;
  net_profit: number;
  franchise_fee_percentage: number;
  franchise_fee_amount: number;
  created_at: string;
}
