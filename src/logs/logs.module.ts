import { Module, forwardRef } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [forwardRef(() => AdminModule)], // Use forwardRef to handle circular dependency
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService], // Export so other modules can use it
})
export class LogsModule {}
