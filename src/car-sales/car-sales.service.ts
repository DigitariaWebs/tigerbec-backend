import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateCarSaleDto } from './dto/car-sale.dto';

@Injectable()
export class CarSalesService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
  ) {}

  async create(createCarSaleDto: CreateCarSaleDto) {
    const { car_id, member_id, sold_price, sold_date } = createCarSaleDto;

    // First, check if the car exists and get its details
    const { data: car, error: carError } = await this.supabase
      .from('cars')
      .select('*')
      .eq('id', car_id)
      .single();

    if (carError || !car) {
      throw new NotFoundException(`Car with ID ${car_id} not found`);
    }

    if (car.member_id !== member_id) {
      throw new BadRequestException(
        `Car with ID ${car_id} does not belong to member ${member_id}`,
      );
    }

    // Check if car is already sold
    if (car.status === 'SOLD') {
      throw new BadRequestException(`Car with ID ${car_id} is already sold`);
    }

    // Check if member exists
    const { data: member, error: memberError } = await this.supabase
      .from('members')
      .select('user_id')
      .eq('user_id', member_id)
      .single();

    if (memberError || !member) {
      throw new NotFoundException(`Member with ID ${member_id} not found`);
    }

    // Get total additional expenses for the car
    const { data: totalExpenses, error: expensesError } = await this.supabase
      .rpc('get_car_total_expenses', { car_uuid: car_id });

    if (expensesError) {
      console.error('Failed to get car expenses:', expensesError);
    }

    const additionalExpenses = totalExpenses || 0;
    const totalCost = car.purchase_price + additionalExpenses;

    // Calculate profit (sale price - purchase price - additional expenses)
    const profit = sold_price - totalCost;

    // Get current franchise fee
    const { data: franchiseFeeData } = await this.supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'tctpro_franchise_fee')
      .maybeSingle();

    const franchiseFeePercentage = franchiseFeeData?.setting_value 
      ? parseFloat(franchiseFeeData.setting_value) 
      : 0;

    // Calculate franchise fee amount and net profit
    // Only apply franchise fee if there's a positive profit
    const franchiseFeeAmount = profit > 0 ? (profit * franchiseFeePercentage) / 100 : 0;
    const netProfit = profit - franchiseFeeAmount;

    // Create the car sale with snapshots
    const { data: carSale, error: saleError } = await this.supabase
      .from('car_sales')
      .insert({
        car_id,
        member_id,
        sold_price,
        sold_date: sold_date || new Date().toISOString().split('T')[0],
        vin_snapshot: car.vin,
        make_snapshot: car.make,
        model_snapshot: car.model,
        year_snapshot: car.year,
        purchase_price_snapshot: car.purchase_price,
        purchase_date_snapshot: car.purchase_date,
        additional_expenses_snapshot: additionalExpenses,
        profit,
        net_profit: netProfit,
        franchise_fee_percentage: franchiseFeePercentage,
        franchise_fee_amount: franchiseFeeAmount,
      })
      .select()
      .single();

    if (saleError) {
      throw new BadRequestException(`Failed to create car sale: ${saleError.message}`);
    }

    // Update car status to SOLD
    const { error: updateError } = await this.supabase
      .from('cars')
      .update({ status: 'SOLD' })
      .eq('id', car_id);

    if (updateError) {
      throw new BadRequestException(`Failed to update car status: ${updateError.message}`);
    }

    return this.transformCarSale(carSale);
  }

  async findAll() {
    const { data, error } = await this.supabase
      .from('car_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch car sales: ${error.message}`);
    }

    // Convert string numeric fields to numbers (Supabase returns NUMERIC as strings)
    return (data || []).map(sale => this.transformCarSale(sale));
  }

  private transformCarSale(sale: any) {
    return {
      ...sale,
      sold_price: parseFloat(sale.sold_price) || 0,
      purchase_price_snapshot: parseFloat(sale.purchase_price_snapshot) || 0,
      additional_expenses_snapshot: parseFloat(sale.additional_expenses_snapshot) || 0,
      profit: parseFloat(sale.profit) || 0,
      net_profit: parseFloat(sale.net_profit) || 0,
      franchise_fee_percentage: parseFloat(sale.franchise_fee_percentage) || 0,
      franchise_fee_amount: parseFloat(sale.franchise_fee_amount) || 0,
      year_snapshot: parseInt(sale.year_snapshot) || 0,
    };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('car_sales')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Car sale with ID ${id} not found`);
    }

    return this.transformCarSale(data);
  }

  async findByCarId(carId: string) {
    const { data, error } = await this.supabase
      .from('car_sales')
      .select('*')
      .eq('car_id', carId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Car sale for car ID ${carId} not found`);
    }

    return this.transformCarSale(data);
  }

  async findByMemberId(memberId: string) {
    const { data, error } = await this.supabase
      .from('car_sales')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch car sales for member: ${error.message}`);
    }

    return (data || []).map(sale => this.transformCarSale(sale));
  }
}
