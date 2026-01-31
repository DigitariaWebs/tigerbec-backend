import { Module } from '@nestjs/common';
import { CarSalesService } from './car-sales.service';
import { CarSalesController } from './car-sales.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [SupabaseModule, AdminModule],
  controllers: [CarSalesController],
  providers: [CarSalesService],
  exports: [CarSalesService],
})
export class CarSalesModule {}
