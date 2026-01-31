import {
    IsString,
    IsNumber,
    IsOptional,
    IsDateString,
    Min,
    Max,
    IsDecimal,
} from 'class-validator';

export class AdminAddCarDto {
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
