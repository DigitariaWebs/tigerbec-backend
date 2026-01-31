import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdminAddFundsDto {
    @IsNumber()
    @Min(0.01)
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
