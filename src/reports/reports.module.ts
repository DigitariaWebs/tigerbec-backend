import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { CarsModule } from '../cars/cars.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [CarsModule, AnalyticsModule, AdminModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
