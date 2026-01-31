import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => LogsModule),
  ],
  controllers: [AdminController],
  providers: [AdminService, AuditService, JwtAuthGuard, RolesGuard, SuperAdminGuard],
  exports: [AdminService, AuditService, JwtAuthGuard, RolesGuard, SuperAdminGuard, JwtModule],
})
export class AdminModule {}
