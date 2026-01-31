import { Module, forwardRef } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { AdminModule } from '../admin/admin.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [AdminModule, forwardRef(() => LogsModule)],
  controllers: [CarsController],
  providers: [CarsService],
  exports: [CarsService],
})
export class CarsModule {}
