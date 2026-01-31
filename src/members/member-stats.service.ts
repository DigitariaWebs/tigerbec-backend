import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class MemberStatsService {
  constructor(
    @Inject('SUPABASE_SERVICE_CLIENT') private readonly supabase: SupabaseClient,
  ) { }

  async getMemberStatistics(memberId: string) {
    // Check if member exists
    const { data: member, error: memberError } = await this.supabase
      .from('members')
      .select('user_id, name, email, balance')
      .eq('user_id', memberId)
      .single();

    if (memberError || !member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    // Get car statistics
    const { data: cars, error: carsError } = await this.supabase
      .from('cars')
      .select('id, status, purchase_price')
      .eq('member_id', memberId);

    if (carsError) {
      throw new BadRequestException(`Failed to fetch car data: ${carsError.message}`);
    }

    const totalCars = cars?.length || 0;
    const carsInInventory = cars?.filter(car => car.status === 'IN_STOCK').length || 0;
    const carsSold = cars?.filter(car => car.status === 'SOLD').length || 0;



    // Get car sales data
    const { data: carSales, error: salesError } = await this.supabase
      .from('car_sales')
      .select('sold_price, profit, net_profit, franchise_fee_amount, purchase_price_snapshot, additional_expenses_snapshot')
      .eq('member_id', memberId);

    if (salesError) {
      throw new BadRequestException(`Failed to fetch sales data: ${salesError.message}`);
    }

    // Calculate total profit and revenue
    const totalGrossProfit = carSales?.reduce((sum, sale) => {
      return sum + (parseFloat(sale.profit?.toString() || '0'));
    }, 0) || 0;

    const totalNetProfit = carSales?.reduce((sum, sale) => {
      return sum + (parseFloat(sale.net_profit?.toString() || '0'));
    }, 0) || 0;

    const totalFranchiseFees = carSales?.reduce((sum, sale) => {
      return sum + (parseFloat(sale.franchise_fee_amount?.toString() || '0'));
    }, 0) || 0;

    const totalAdditionalExpenses = carSales?.reduce((sum, sale) => {
      return sum + (parseFloat(sale.additional_expenses_snapshot?.toString() || '0'));
    }, 0) || 0;

    const totalRevenue = carSales?.reduce((sum, sale) => {
      return sum + (parseFloat(sale.sold_price?.toString() || '0'));
    }, 0) || 0;

    // Get recent sales (last 5)
    const { data: recentSales, error: recentSalesError } = await this.supabase
      .from('car_sales')
      .select('id, make_snapshot, model_snapshot, year_snapshot, sold_price, sold_date, profit, net_profit, franchise_fee_amount, additional_expenses_snapshot')
      .eq('member_id', memberId)
      .order('sold_date', { ascending: false })
      .limit(5);

    if (recentSalesError) {
      throw new BadRequestException(`Failed to fetch recent sales: ${recentSalesError.message}`);
    }

    // Get approved fund requests for investment calculation
    const { data: funds, error: fundsError } = await this.supabase
      .from('fund_requests')
      .select('amount')
      .eq('member_id', memberId)
      .eq('status', 'approved');

    if (fundsError && fundsError.code !== '42P01') { // 42P01 is table not found, just in case
      console.error('Error fetching fund requests:', fundsError);
    }

    const totalFunds = funds?.reduce((sum, req) => sum + (parseFloat(req.amount?.toString() || '0')), 0) || 0;

    // Calculate total investment: Max of (Total Approved Funds, Total Car Cost)
    // This handles:
    // 1. Funds added but not spent (Investment = Funds)
    // 2. Funds spent on cars (Investment = Funds)
    // 3. Cars added directly without funds (Investment = Car Cost)
    const totalCarCost = cars?.reduce((sum, car) => sum + (parseFloat(car.purchase_price?.toString() || '0')), 0) || 0;
    const totalInvestment = Math.max(totalFunds, totalCarCost);

    // Calculate calculated balance
    const calculatedBalance = Math.max(0, totalFunds - totalCarCost);

    // Get tasks statistics
    const { data: tasks, error: tasksError } = await this.supabase
      .from('tasks')
      .select('status, priority, due_date')
      .eq('member_id', memberId);

    const taskStats = {
      total: tasks?.length || 0,
      todo: tasks?.filter(t => t.status === 'TODO').length || 0,
      in_progress: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
      completed: tasks?.filter(t => t.status === 'COMPLETED').length || 0,
      overdue: tasks?.filter(t =>
        t.status !== 'COMPLETED' &&
        t.due_date &&
        new Date(t.due_date) < new Date()
      ).length || 0,
    };

    // Get recent tasks (next 5 upcoming or most recent)
    const { data: recentTasks, error: recentTasksError } = await this.supabase
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      member: {
        id: member.user_id,
        name: member.name,
        email: member.email,
      },
      balance: parseFloat((member.balance || calculatedBalance).toString()),
      cars: {
        total: totalCars,
        inInventory: carsInInventory,
        sold: carsSold,
      },
      financial: {
        totalInvestment: parseFloat(totalInvestment.toFixed(2)),
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalGrossProfit: parseFloat(totalGrossProfit.toFixed(2)),
        totalNetProfit: parseFloat(totalNetProfit.toFixed(2)),
        totalFranchiseFees: parseFloat(totalFranchiseFees.toFixed(2)),
        totalAdditionalExpenses: parseFloat(totalAdditionalExpenses.toFixed(2)),
        profitMargin: totalRevenue > 0
          ? parseFloat(((totalGrossProfit / totalRevenue) * 100).toFixed(2))
          : 0,
        netProfitMargin: totalRevenue > 0
          ? parseFloat(((totalNetProfit / totalRevenue) * 100).toFixed(2))
          : 0,
      },
      recentSales: recentSales || [],
      tasks: taskStats,
      recentTasks: recentTasks || [],
    };
  }
}
