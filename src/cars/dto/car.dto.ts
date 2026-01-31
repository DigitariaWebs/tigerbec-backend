import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
  Max,
  IsDecimal,
} from 'class-validator';
import { CarStatus } from '../../types';

export class CreateCarDto {
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

  @IsDecimal({ decimal_digits: '2' })
  purchase_price: string;

  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCarDto {
  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  purchase_price?: string;

  @IsOptional()
  @IsDateString()
  purchase_date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class MarkAsSoldDto {
  @IsDecimal({ decimal_digits: '2' })
  sale_price: string;

  @IsDateString()
  sale_date: string;
}

export class QueryCarsDto {
  @IsOptional()
  @IsEnum(CarStatus)
  status?: CarStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sort?: 'purchase_date' | 'year' | 'model';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';
}
