import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateCarDto, UpdateCarDto, MarkAsSoldDto, QueryCarsDto } from './dto/car.dto';
import { CarStatus, Car } from '../types';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class CarsService {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabaseService: SupabaseClient,
    private readonly logsService: LogsService,
  ) {}

  async createCar(memberId: string, createCarDto: CreateCarDto): Promise<Car> {
    // Check VIN uniqueness for this member
    const { data: existingCar } = await this.supabaseService
      .from('cars')
      .select('id')
      .eq('member_id', memberId)
      .eq('vin', createCarDto.vin)
      .single();

    if (existingCar) {
      throw new BadRequestException('A car with this VIN already exists in your inventory');
    }

    const { data, error } = await this.supabaseService
      .from('cars')
      .insert({
        member_id: memberId,
        ...createCarDto,
        status: CarStatus.IN_STOCK,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to create car: ' + error.message);
    }

    // Get member email for logging
    const { data: member } = await this.supabaseService
      .from('members')
      .select('email')
      .eq('user_id', memberId)
      .single();

    // Log car addition (use null for user_id to avoid FK constraint issues)
    await this.logsService.createLog({
      user_id: null, // Set to null to avoid FK constraint issues
      user_email: member?.email || 'unknown',
      user_role: 'member',
      activity_type: 'car_added',
      resource_type: 'car',
      resource_id: data.id,
      status: 'success',
      metadata: { 
        member_id: memberId, // Store member ID in metadata instead
        vin: data.vin, 
        make: data.make,
        model: data.model, 
        year: data.year,
        purchase_price: data.purchase_price 
      },
    });

    return data;
  }

  async getCars(memberId: string, query: QueryCarsDto): Promise<Car[]> {
    let queryBuilder = this.supabaseService
      .from('cars')
      .select('*')
      .eq('member_id', memberId);

    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    if (query.search) {
      queryBuilder = queryBuilder.or(
        `model.ilike.%${query.search}%,vin.ilike.%${query.search}%`,
      );
    }

    if (query.sort) {
      const order = query.order || 'desc';
      queryBuilder = queryBuilder.order(query.sort, { ascending: order === 'asc' });
    } else {
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new BadRequestException('Failed to fetch cars: ' + error.message);
    }

    return data || [];
  }

  async getCarById(memberId: string, carId: string): Promise<Car> {
    const { data, error } = await this.supabaseService
      .from('cars')
      .select('*')
      .eq('id', carId)
      .eq('member_id', memberId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Car not found');
    }

    return data;
  }

  async updateCar(
    memberId: string,
    carId: string,
    updateCarDto: UpdateCarDto,
  ): Promise<Car> {
    // Verify ownership
    await this.getCarById(memberId, carId);

    const { data, error } = await this.supabaseService
      .from('cars')
      .update({
        ...updateCarDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', carId)
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to update car: ' + error.message);
    }

    // Get member email for logging
    const { data: member } = await this.supabaseService
      .from('members')
      .select('email')
      .eq('user_id', memberId)
      .single();

    // Log car update - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: memberId,
    //   userEmail: member?.email || 'unknown',
    //   userRole: 'member',
    //   activityType: 'car_updated',
    //   resourceType: 'car',
    //   resourceId: carId,
    //   status: 'success',
    //   metadata: { 
    //     vin: data.vin,
    //     updates: updateCarDto 
    //   },
    // });

    return data;
  }

  async markAsSold(
    memberId: string,
    carId: string,
    markAsSoldDto: MarkAsSoldDto,
  ): Promise<Car> {
    const car = await this.getCarById(memberId, carId);

    if (car.status === CarStatus.SOLD) {
      throw new BadRequestException('Car is already marked as sold');
    }

    // Calculate profit with additional expenses
    const salePrice = typeof markAsSoldDto.sale_price === 'string' 
      ? parseFloat(markAsSoldDto.sale_price) 
      : markAsSoldDto.sale_price || 0;
    const purchasePrice = typeof car.purchase_price === 'string'
      ? parseFloat(car.purchase_price)
      : car.purchase_price || 0;

    // Get total additional expenses for the car
    const { data: totalExpenses, error: expensesError } = await this.supabaseService
      .rpc('get_car_total_expenses', { car_uuid: carId });

    if (expensesError) {
      console.error('Failed to get car expenses:', expensesError);
    }

    const additionalExpenses = totalExpenses || 0;
    const totalCost = purchasePrice + additionalExpenses;
    
    // Calculate profit (sale price - purchase price - additional expenses)
    const profit = salePrice - totalCost;

    // Get current franchise fee
    const { data: franchiseFeeData } = await this.supabaseService
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

    // Create car sale record with snapshots
    const { error: saleError } = await this.supabaseService
      .from('car_sales')
      .insert({
        car_id: carId,
        member_id: memberId,
        sold_price: markAsSoldDto.sale_price,
        sold_date: markAsSoldDto.sale_date || new Date().toISOString().split('T')[0],
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
      });

    if (saleError) {
      throw new BadRequestException('Failed to create car sale: ' + saleError.message);
    }

    // Update car status to SOLD
    const { data, error } = await this.supabaseService
      .from('cars')
      .update({
        status: CarStatus.SOLD,
        updated_at: new Date().toISOString(),
      })
      .eq('id', carId)
      .eq('member_id', memberId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Failed to mark car as sold: ' + error.message);
    }

    // Get member email for logging
    const { data: member } = await this.supabaseService
      .from('members')
      .select('email')
      .eq('user_id', memberId)
      .single();

    // Log car sale (use null for user_id to avoid FK constraint issues)
    await this.logsService.createLog({
      user_id: null, // Set to null to avoid FK constraint issues
      user_email: member?.email || 'unknown',
      user_role: 'member',
      activity_type: 'car_sold',
      resource_type: 'car',
      resource_id: carId,
      status: 'success',
      metadata: { 
        member_id: memberId, // Store member ID in metadata instead
        vin: data.vin,
        make: data.make,
        model: data.model,
        year: data.year,
        purchase_price: car.purchase_price,
        sale_price: markAsSoldDto.sale_price,
        profit: profit
      },
    });

    return data;
  }

  async deleteCar(memberId: string, carId: string): Promise<void> {
    const car = await this.getCarById(memberId, carId);

    // Get member email for logging
    const { data: member } = await this.supabaseService
      .from('members')
      .select('email')
      .eq('user_id', memberId)
      .single();

    const { error } = await this.supabaseService
      .from('cars')
      .delete()
      .eq('id', carId)
      .eq('member_id', memberId);

    if (error) {
      throw new BadRequestException('Failed to delete car: ' + error.message);
    }

    // Log car deletion - TODO: Implement logs module
    // await this.logsService.createActivityLog({
    //   userId: memberId,
    //   userEmail: member?.email || 'unknown',
    //   userRole: 'member',
    //   activityType: 'car_deleted',
    //   resourceType: 'car',
    //   resourceId: carId,
    //   status: 'success',
    //   metadata: { 
    //     vin: car.vin,
    //     make: car.make,
    //     model: car.model,
    //     year: car.year
    //   },
    // });
  }

  async getSalesHistory(memberId: string): Promise<Car[]> {
    const { data, error } = await this.supabaseService
      .from('cars')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', CarStatus.SOLD)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to fetch sales history: ' + error.message);
    }

    return data || [];
  }
}
