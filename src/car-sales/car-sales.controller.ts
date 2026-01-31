import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CarSalesService } from './car-sales.service';
import { CreateCarSaleDto } from './dto/car-sale.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('car-sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CarSalesController {
  constructor(private readonly carSalesService: CarSalesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createCarSaleDto: CreateCarSaleDto) {
    return this.carSalesService.create(createCarSaleDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.carSalesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.carSalesService.findOne(id);
  }

  @Get('car/:carId')
  @Roles(UserRole.ADMIN)
  findByCarId(@Param('carId', ParseUUIDPipe) carId: string) {
    return this.carSalesService.findByCarId(carId);
  }

  @Get('member/:memberId')
  @Roles(UserRole.ADMIN)
  findByMemberId(@Param('memberId', ParseUUIDPipe) memberId: string) {
    return this.carSalesService.findByMemberId(memberId);
  }

  // Member endpoints - members can view their own car sales
  @Get('me/car-sales')
  @Roles(UserRole.MEMBER)
  findMyCarSales(@CurrentUser() user: CurrentUserData) {
    return this.carSalesService.findByMemberId(user.id);
  }
}
