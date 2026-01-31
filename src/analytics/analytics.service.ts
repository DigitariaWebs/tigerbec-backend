import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AnalyticsQueryDto,
  MemberKPIs,
  GlobalKPIs,
  MemberProfitData,
  AgeBandAnalytics,
} from './dto/analytics.dto';
import { CarStatus } from '../types';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async getMemberKPIs(memberId: string, query?: AnalyticsQueryDto): Promise<MemberKPIs> {
    let carsQuery = this.supabase
      .from('cars')
      .select('*, car_sales(sold_price, sold_date)')
      .eq('member_id', memberId);

    if (query?.start_date) {
      carsQuery = carsQuery.gte('purchase_date', query.start_date);
    }
    if (query?.end_date) {
      carsQuery = carsQuery.lte('purchase_date', query.end_date);
    }

    const { data: cars, error } = await carsQuery;

    if (error) {
      throw new BadRequestException('Failed to fetch analytics: ' + error.message);
    }

    const totalInvested = cars.reduce(
      (sum, car) => sum + parseFloat(car.purchase_price || '0'),
      0,
    );

    const soldCars = cars.filter((car) => car.status === CarStatus.SOLD);
    const totalGained = soldCars.reduce(
      (sum, car) => {
        const carSale = Array.isArray(car.car_sales) ? car.car_sales[0] : car.car_sales;
        return sum + parseFloat(carSale?.sold_price || '0');
      },
      0,
    );

    const totalProfit = soldCars.reduce(
      (sum, car) => {
        const carSale = Array.isArray(car.car_sales) ? car.car_sales[0] : car.car_sales;
        return sum + (parseFloat(carSale?.sold_price || '0') - parseFloat(car.purchase_price || '0'));
      },
      0,
    );

    const profitRatio = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    return {
      total_invested: totalInvested.toFixed(2),
      total_gained: totalGained.toFixed(2),
      total_profit: totalProfit.toFixed(2),
      profit_ratio: parseFloat(profitRatio.toFixed(2)),
      total_cars_bought: cars.length,
      total_cars_sold: soldCars.length,
    };
  }

  async getGlobalKPIs(query?: AnalyticsQueryDto): Promise<GlobalKPIs> {
    let carsQuery = this.supabase.from('cars').select('*, car_sales(sold_price, sold_date, net_profit, franchise_fee_amount)');

    if (query?.start_date) {
      carsQuery = carsQuery.gte('purchase_date', query.start_date);
    }
    if (query?.end_date) {
      carsQuery = carsQuery.lte('purchase_date', query.end_date);
    }

    const { data: cars, error } = await carsQuery;

    if (error) {
      throw new BadRequestException('Failed to fetch global analytics: ' + error.message);
    }

    const totalInvested = cars.reduce(
      (sum, car) => sum + parseFloat(car.purchase_price || '0'),
      0,
    );

    const soldCars = cars.filter((car) => car.status === CarStatus.SOLD);
    // Use net_profit from car_sales table
    const totalProfit = soldCars.reduce(
      (sum, car) => {
        const carSale = Array.isArray(car.car_sales) ? car.car_sales[0] : car.car_sales;
        return sum + parseFloat(carSale?.net_profit || '0');
      },
      0,
    );

    // Calculate total franchise fees
    const totalFranchiseFees = soldCars.reduce(
      (sum, car) => {
        const carSale = Array.isArray(car.car_sales) ? car.car_sales[0] : car.car_sales;
        return sum + parseFloat(carSale?.franchise_fee_amount || '0');
      },
      0,
    );

    // Get unique member count
    const { count: memberCount } = await this.supabase
      .from('members')
      .select('*', { count: 'exact', head: true });

    // Calculate average profit ratio across all members
    const memberIds = [...new Set(cars.map((car) => car.member_id))];
    let totalProfitRatio = 0;
    let membersWithSales = 0;

    for (const memberId of memberIds) {
      const memberCars = cars.filter((car) => car.member_id === memberId);
      const memberInvested = memberCars.reduce(
        (sum, car) => sum + parseFloat(car.purchase_price || '0'),
        0,
      );
      const memberSoldCars = memberCars.filter((car) => car.status === CarStatus.SOLD);
      const memberProfit = memberSoldCars.reduce(
        (sum, car) => {
          const carSale = Array.isArray(car.car_sales) ? car.car_sales[0] : car.car_sales;
          return sum + parseFloat(carSale?.net_profit || '0');
        },
        0,
      );

      if (memberInvested > 0) {
        totalProfitRatio += (memberProfit / memberInvested) * 100;
        membersWithSales++;
      }
    }

    const avgProfitRatio =
      membersWithSales > 0 ? totalProfitRatio / membersWithSales : 0;

    return {
      total_invested: totalInvested.toFixed(2),
      total_profit: totalProfit.toFixed(2),
      total_franchise_fees: totalFranchiseFees.toFixed(2),
      total_cars_bought: cars.length,
      total_cars_sold: soldCars.length,
      total_members: memberCount || 0,
      average_profit_ratio: parseFloat(avgProfitRatio.toFixed(2)),
    };
  }

  async getMemberProfitData(query?: AnalyticsQueryDto): Promise<MemberProfitData[]> {
    let carsQuery = this.supabase.from('cars').select('*, car_sales(sold_price, sold_date, net_profit)');

    if (query?.start_date) {
      carsQuery = carsQuery.gte('purchase_date', query.start_date);
    }
    if (query?.end_date) {
      carsQuery = carsQuery.lte('purchase_date', query.end_date);
    }

    const { data: cars, error: carsError } = await carsQuery;
    if (carsError) {
      throw new BadRequestException('Failed to fetch car data: ' + carsError.message);
    }

    const { data: profiles, error: profilesError } = await this.supabase
      .from('members')
      .select('user_id, name');

    if (profilesError) {
      throw new BadRequestException('Failed to fetch profiles: ' + profilesError.message);
    }

    const memberIds = [...new Set(cars.map((car) => car.member_id))];
    const profitData: MemberProfitData[] = [];

    for (const memberId of memberIds) {
      const profile = profiles.find((p) => p.user_id === memberId);
      const memberCars = cars.filter((car) => car.member_id === memberId);
      
      const totalInvested = memberCars.reduce(
        (sum, car) => sum + parseFloat(car.purchase_price || '0'),
        0,
      );

      const soldCars = memberCars.filter((car) => car.status === CarStatus.SOLD);
      const totalProfit = soldCars.reduce(
        (sum, car) => {
          const carSale = Array.isArray(car.car_sales) ? car.car_sales[0] : car.car_sales;
          return sum + parseFloat(carSale?.net_profit || '0');
        },
        0,
      );

      const profitRatio = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

      profitData.push({
        member_id: memberId,
        member_name: profile?.name || 'Unknown',
        profit: totalProfit.toFixed(2),
        profit_ratio: parseFloat(profitRatio.toFixed(2)),
        total_invested: totalInvested.toFixed(2),
      });
    }

    return profitData.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit));
  }

  private getAgeBand(age: number): string {
    if (age >= 18 && age <= 24) return '18-24';
    if (age >= 25 && age <= 34) return '25-34';
    if (age >= 35 && age <= 44) return '35-44';
    if (age >= 45 && age <= 54) return '45-54';
    if (age >= 55) return '55+';
    return 'Unknown';
  }

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  async getAgeBandAnalytics(query?: AnalyticsQueryDto): Promise<AgeBandAnalytics[]> {
    const { data: profiles, error: profilesError } = await this.supabase
      .from('members')
      .select('user_id, name, date_of_birth');

    if (profilesError) {
      throw new BadRequestException('Failed to fetch profiles: ' + profilesError.message);
    }

    let carsQuery = this.supabase.from('cars').select('*, car_sales(sold_price, sold_date, net_profit)');

    if (query?.start_date) {
      carsQuery = carsQuery.gte('purchase_date', query.start_date);
    }
    if (query?.end_date) {
      carsQuery = carsQuery.lte('purchase_date', query.end_date);
    }

    const { data: cars, error: carsError } = await carsQuery;
    if (carsError) {
      throw new BadRequestException('Failed to fetch car data: ' + carsError.message);
    }

    const ageBandMap = new Map<string, {
      total_invested: number;
      total_profit: number;
      cars_purchased: number;
      members: Set<string>;
    }>();

    const ageBands = ['18-24', '25-34', '35-44', '45-54', '55+'];
    ageBands.forEach(band => {
      ageBandMap.set(band, {
        total_invested: 0,
        total_profit: 0,
        cars_purchased: 0,
        members: new Set(),
      });
    });

    for (const car of cars) {
      const profile = profiles.find((p) => p.user_id === car.member_id);
      if (!profile || !profile.date_of_birth) continue;

      const age = this.calculateAge(profile.date_of_birth);
      const band = this.getAgeBand(age);
      
      if (!ageBandMap.has(band)) continue;

      const bandData = ageBandMap.get(band)!;
      bandData.cars_purchased++;
      bandData.members.add(car.member_id);
      bandData.total_invested += parseFloat(car.purchase_price || '0');

      if (car.status === CarStatus.SOLD) {
        // Handle car_sales as either array or single object
        const carSale = Array.isArray(car.car_sales) ? car.car_sales[0] : car.car_sales;
        const netProfit = parseFloat(carSale?.net_profit || '0');
        bandData.total_profit += netProfit;
      }
    }

    const result: AgeBandAnalytics[] = [];

    ageBandMap.forEach((data, band) => {
      const profitRatio = data.total_invested > 0 
        ? (data.total_profit / data.total_invested) * 100 
        : 0;

      result.push({
        age_band: band,
        profit_ratio: parseFloat(profitRatio.toFixed(2)),
        cars_purchased: data.cars_purchased,
        total_profit: data.total_profit.toFixed(2),
        member_count: data.members.size,
      });
    });

    return result.sort((a, b) => {
      const order = ['18-24', '25-34', '35-44', '45-54', '55+'];
      return order.indexOf(a.age_band) - order.indexOf(b.age_band);
    });
  }
}
