import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { GasCylindersService } from './gas-cylinders.service';
import { CreateGasCylinderDto } from './dto/create-gas-cylinder.dto';
import { UpdateGasCylinderDto } from './dto/update-gas-cylinder.dto';
import { CreateCylinderSaleDto } from './dto/create-cylinder-sale.dto';
import { CreateCylinderStockInDto } from './dto/create-cylinder-stock-in.dto';
import { GasCylinderQueryDto } from './dto/gas-cylinder-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@gasstation/shared-types';

@Controller('v1/gas-cylinders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GasCylindersController {
  constructor(private readonly service: GasCylindersService) {}

  @Post('catalog')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  createCylinder(@Body() dto: CreateGasCylinderDto) {
    return this.service.createCylinder(dto);
  }

  @Get('catalog')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getCylinders(@Query() query: GasCylinderQueryDto, @CurrentUser() user: any) {
    const stationId = ['STATION_MANAGER', 'WORKER'].includes(user.role) ? user.stationId : null;
    return this.service.getCylinders(query, stationId);
  }

  @Get('catalog/low-stock')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getLowStock(@Query('stationId') stationId: string | undefined, @CurrentUser() user: any) {
    const sid = user.role === 'STATION_MANAGER' ? user.stationId : stationId;
    return this.service.getLowStock(sid);
  }

  @Patch('catalog/:id')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  updateCylinder(@Param('id') id: string, @Body() dto: UpdateGasCylinderDto) {
    return this.service.updateCylinder(id, dto);
  }

  @Post('sales')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.ADMIN)
  createSale(@Body() dto: CreateCylinderSaleDto, @CurrentUser() user: any) {
    return this.service.createSale(dto, user.sub);
  }

  @Get('sales')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getSales(@Query() query: GasCylinderQueryDto, @CurrentUser() user: any) {
    return this.service.getSales(query, user.role, user.stationId ?? null);
  }

  @Post('stock-ins')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  createStockIn(@Body() dto: CreateCylinderStockInDto, @CurrentUser() user: any) {
    return this.service.createStockIn(dto, user.sub);
  }

  @Get('stock-ins')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getStockIns(@Query() query: GasCylinderQueryDto, @CurrentUser() user: any) {
    const stationId = user.role === 'STATION_MANAGER' ? user.stationId : null;
    return this.service.getStockIns(query, stationId);
  }
}
