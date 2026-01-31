import { Module } from '@nestjs/common';
import { FundRequestsController } from './fund-requests.controller';
import { FundRequestsService } from './fund-requests.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [SupabaseModule, AdminModule],
  controllers: [FundRequestsController],
  providers: [FundRequestsService],
  exports: [FundRequestsService],
})
export class FundRequestsModule {}
