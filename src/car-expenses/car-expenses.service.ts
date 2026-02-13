import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateCarExpenseDto } from './dto/create-car-expense.dto';
import { UpdateCarExpenseDto } from './dto/update-car-expense.dto';

@Injectable()
export class CarExpensesService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  private isAdminRole(role: string): boolean {
    return role === 'admin' || role === 'super_admin';
  }

  async create(userId: string, role: string, createDto: CreateCarExpenseDto) {
    // Verify car access. Members can only add expenses to their own cars.
    const isAdmin = this.isAdminRole(role);
    let carQuery = this.supabase
      .from('cars')
      .select('id, member_id')
      .eq('id', createDto.car_id);

    if (!isAdmin) {
      carQuery = carQuery.eq('member_id', userId);
    }

    const { data: car, error: carError } = await carQuery.single();

    if (carError || !car) {
      throw new NotFoundException('Car not found or you do not have permission');
    }

    const ownerMemberId = isAdmin ? car.member_id : userId;

    const { data, error } = await this.supabase
      .from('car_additional_expenses')
      .insert({
        car_id: createDto.car_id,
        member_id: ownerMemberId,
        amount: createDto.amount,
        description: createDto.description,
        expense_date: createDto.expense_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAllByCarId(carId: string, userId: string, role: string) {
    const isAdmin = this.isAdminRole(role);
    let query = this.supabase
      .from('car_additional_expenses')
      .select('*')
      .eq('car_id', carId)
      .order('expense_date', { ascending: false });

    // If not admin, filter by member_id
    if (!isAdmin) {
      query = query.eq('member_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getTotalExpenses(carId: string, userId: string, role: string) {
    const isAdmin = this.isAdminRole(role);
    // Verify access to car
    let carQuery = this.supabase
      .from('cars')
      .select('id, member_id')
      .eq('id', carId);

    if (!isAdmin) {
      carQuery = carQuery.eq('member_id', userId);
    }

    const { data: car, error: carError } = await carQuery.single();

    if (carError || !car) {
      throw new NotFoundException('Car not found');
    }

    const { data, error } = await this.supabase
      .rpc('get_car_total_expenses', { car_uuid: carId });

    if (error) {
      throw new Error(error.message);
    }

    return { car_id: carId, total_expenses: data || 0 };
  }

  async findOne(id: string, userId: string, role: string) {
    const isAdmin = this.isAdminRole(role);
    let query = this.supabase
      .from('car_additional_expenses')
      .select('*')
      .eq('id', id);

    if (!isAdmin) {
      query = query.eq('member_id', userId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      throw new NotFoundException('Expense not found');
    }

    return data;
  }

  async update(id: string, userId: string, role: string, updateDto: UpdateCarExpenseDto) {
    const isAdmin = this.isAdminRole(role);
    // Verify ownership for members; admins can update any expense
    const { data: existing } = await this.supabase
      .from('car_additional_expenses')
      .select('member_id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Expense not found');
    }

    if (!isAdmin && existing.member_id !== userId) {
      throw new ForbiddenException('You do not have permission to update this expense');
    }

    const { data, error } = await this.supabase
      .from('car_additional_expenses')
      .update(updateDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async remove(id: string, userId: string, role: string) {
    const isAdmin = this.isAdminRole(role);
    // Verify ownership for members; admins can delete any expense
    const { data: existing } = await this.supabase
      .from('car_additional_expenses')
      .select('member_id')
      .eq('id', id)
      .single();

    if (!existing) {
      throw new NotFoundException('Expense not found');
    }

    if (!isAdmin && existing.member_id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this expense');
    }

    const { error } = await this.supabase
      .from('car_additional_expenses')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return { message: 'Expense deleted successfully' };
  }
}
