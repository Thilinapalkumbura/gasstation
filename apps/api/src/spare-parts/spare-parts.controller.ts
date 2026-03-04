import { Controller, Post, Get, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { SparePartsService } from './spare-parts.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { CreateSparePartSaleDto } from './dto/create-spare-part-sale.dto';
import { CreateSparePartStockInDto } from './dto/create-spare-part-stock-in.dto';
import { SparePartQueryDto } from './dto/spare-part-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@gasstation/shared-types';

@Controller('v1/spare-parts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SparePartsController {
  constructor(private readonly service: SparePartsService) {}

  @Post('catalog')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  createPart(@Body() dto: CreateSparePartDto) {
    return this.service.createPart(dto);
  }

  @Get('catalog')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getParts(@Query() query: SparePartQueryDto, @CurrentUser() user: any) {
    const stationId = ['STATION_MANAGER', 'WORKER'].includes(user.role) ? user.stationId : null;
    return this.service.getParts(query, stationId);
  }

  @Get('catalog/low-stock')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getLowStock(@Query('stationId') stationId: string | undefined, @CurrentUser() user: any) {
    const sid = user.role === 'STATION_MANAGER' ? user.stationId : stationId;
    return this.service.getLowStock(sid);
  }

  @Patch('catalog/:id')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  updatePart(@Param('id') id: string, @Body() dto: UpdateSparePartDto) {
    return this.service.updatePart(id, dto);
  }

  @Post('sales')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.ADMIN)
  createSale(@Body() dto: CreateSparePartSaleDto, @CurrentUser() user: any) {
    return this.service.createSale(dto, user.sub);
  }

  @Get('sales')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getSales(@Query() query: SparePartQueryDto, @CurrentUser() user: any) {
    return this.service.getSales(query, user.role, user.stationId ?? null);
  }

  @Post('stock-ins')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  createStockIn(@Body() dto: CreateSparePartStockInDto, @CurrentUser() user: any) {
    return this.service.createStockIn(dto, user.sub);
  }

  @Get('stock-ins')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getStockIns(@Query() query: SparePartQueryDto, @CurrentUser() user: any) {
    const stationId = user.role === 'STATION_MANAGER' ? user.stationId : null;
    return this.service.getStockIns(query, stationId);
  }
}
