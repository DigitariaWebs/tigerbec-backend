import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { SupabaseModule } from './supabase/supabase.module';
import { CarsModule } from './cars/cars.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { MembersModule } from './members/members.module';
import { ReportsModule } from './reports/reports.module';
import { CarSalesModule } from './car-sales/car-sales.module';
import { LogsModule } from './logs/logs.module';
import { EventsModule } from './events/events.module';
import { TasksModule } from './tasks/tasks.module';
import { InventoryRequestsModule } from './inventory-requests/inventory-requests.module';
import { FundRequestsModule } from './fund-requests/fund-requests.module';
import { CarExpensesModule } from './car-expenses/car-expenses.module';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    SupabaseModule,
    LogsModule,
    CarsModule,
    AnalyticsModule,
    AdminModule,
    MembersModule,
    ReportsModule,
    CarSalesModule,
    EventsModule,
    TasksModule,
    InventoryRequestsModule,
    FundRequestsModule,
    CarExpensesModule,
    AnnouncementsModule,
  ],
})
export class AppModule {}
