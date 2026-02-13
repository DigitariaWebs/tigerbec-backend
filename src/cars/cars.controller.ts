import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { CreateCarDto, UpdateCarDto, MarkAsSoldDto, QueryCarsDto } from './dto/car.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('cars')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MEMBER, UserRole.ADMIN)
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  async createCar(
    @CurrentUser() user: CurrentUserData,
    @Body() createCarDto: CreateCarDto,
  ) {
    return this.carsService.createCar(user.id, createCarDto);
  }

  @Get()
  async getCars(
    @CurrentUser() user: CurrentUserData,
    @Query() query: QueryCarsDto,
  ) {
    return this.carsService.getCars(user.id, query);
  }

  @Get('sales-history')
  async getSalesHistory(@CurrentUser() user: CurrentUserData) {
    return this.carsService.getSalesHistory(user.id);
  }

  @Get(':id')
  async getCarById(
    @CurrentUser() user: CurrentUserData,
    @Param('id') carId: string,
  ) {
    return this.carsService.getCarById(user.id, carId);
  }

  @Patch(':id')
  async updateCar(
    @CurrentUser() user: CurrentUserData,
    @Param('id') carId: string,
    @Body() updateCarDto: UpdateCarDto,
  ) {
    return this.carsService.updateCar(user.id, carId, updateCarDto);
  }

  @Post(':id/mark-sold')
  @Roles(UserRole.ADMIN)
  async markAsSold(
    @CurrentUser() user: CurrentUserData,
    @Param('id') carId: string,
    @Body() markAsSoldDto: MarkAsSoldDto,
  ) {
    return this.carsService.markAsSold(user.id, carId, markAsSoldDto);
  }

  @Delete(':id')
  async deleteCar(
    @CurrentUser() user: CurrentUserData,
    @Param('id') carId: string,
  ) {
    await this.carsService.deleteCar(user.id, carId);
    return { message: 'Car deleted successfully' };
  }
}
