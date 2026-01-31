import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CarExpensesService } from './car-expenses.service';
import { CreateCarExpenseDto } from './dto/create-car-expense.dto';
import { UpdateCarExpenseDto } from './dto/update-car-expense.dto';
import { JwtAuthGuard } from '../admin/guards/jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../admin/decorators/current-user.decorator';
import { UserRole } from '../types';

@Controller('car-expenses')
export class CarExpensesController {
  constructor(private readonly carExpensesService: CarExpensesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() createDto: CreateCarExpenseDto,
  ) {
    return this.carExpensesService.create(user.id, createDto);
  }

  @Get('car/:carId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async findAllByCarId(
    @CurrentUser() user: CurrentUserData,
    @Param('carId') carId: string,
  ) {
    return this.carExpensesService.findAllByCarId(carId, user.id, user.role);
  }

  @Get('car/:carId/total')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async getTotalExpenses(
    @CurrentUser() user: CurrentUserData,
    @Param('carId') carId: string,
  ) {
    return this.carExpensesService.getTotalExpenses(carId, user.id, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER, UserRole.ADMIN)
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.carExpensesService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateDto: UpdateCarExpenseDto,
  ) {
    return this.carExpensesService.update(id, user.id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MEMBER)
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.carExpensesService.remove(id, user.id);
  }
}
