import { IsOptional, IsDateString, IsString } from 'class-validator';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  age_band?: string;
}

export interface MemberKPIs {
  total_invested: string;
  total_gained: string;
  total_profit: string;
  profit_ratio: number;
  total_cars_bought: number;
  total_cars_sold: number;
}

export interface GlobalKPIs {
  total_invested: string;
  total_profit: string;
  total_franchise_fees: string;
  total_cars_bought: number;
  total_cars_sold: number;
  total_members: number;
  average_profit_ratio: number;
}

export interface MemberProfitData {
  member_id: string;
  member_name: string;
  profit: string;
  profit_ratio: number;
  total_invested: string;
}

export interface AgeBandAnalytics {
  age_band: string;
  profit_ratio: number;
  cars_purchased: number;
  total_profit: string;
  member_count: number;
}
