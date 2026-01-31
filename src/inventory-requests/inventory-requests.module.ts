import { Module, forwardRef } from '@nestjs/common';
import { InventoryRequestsController } from './inventory-requests.controller';
import { InventoryRequestsService } from './inventory-requests.service';
import { AdminModule } from '../admin/admin.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [AdminModule, forwardRef(() => LogsModule)],
  controllers: [InventoryRequestsController],
  providers: [InventoryRequestsService],
  exports: [InventoryRequestsService],
})
export class InventoryRequestsModule {}
