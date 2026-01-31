import { Module } from '@nestjs/common';
import { CarExpensesController } from './car-expenses.controller';
import { CarExpensesService } from './car-expenses.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [SupabaseModule, AdminModule],
  controllers: [CarExpensesController],
  providers: [CarExpensesService],
  exports: [CarExpensesService],
})
export class CarExpensesModule {}
