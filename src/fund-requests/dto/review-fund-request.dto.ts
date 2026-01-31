import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ReviewFundRequestDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  @IsNotEmpty()
  status: 'approved' | 'rejected';

  @ValidateIf((o) => o.status === 'rejected')
  @IsString()
  @IsNotEmpty()
  rejection_reason?: string;
}
