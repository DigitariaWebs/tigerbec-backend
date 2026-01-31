import { Module, forwardRef } from '@nestjs/common';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { MemberStatsService } from './member-stats.service';
import { AdminModule } from '../admin/admin.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [AdminModule, forwardRef(() => LogsModule)],
  controllers: [MembersController],
  providers: [MembersService, MemberStatsService],
  exports: [MembersService, MemberStatsService],
})
export class MembersModule {}
