import { Module, forwardRef } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { LogsModule } from '../logs/logs.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [SupabaseModule, LogsModule, forwardRef(() => AdminModule)],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
