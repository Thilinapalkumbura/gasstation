import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { RecordMovementDto } from './dto/record-movement.dto';
import { UpdateReorderDto } from './dto/update-reorder.dto';
import { StockMovementQueryDto } from './dto/stock-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, JwtPayload } from '@gasstation/shared-types';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'stock', version: '1' })
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ── GET /stock/tanks — list all tanks (filtered by station for workers) ────
  @Get('tanks')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER, UserRole.WORKER)
  @ApiOperation({ summary: 'List tanks. Workers/managers see their station only.' })
  @ApiQuery({ name: 'stationId', required: false })
  getTanks(@Query('stationId') stationId: string, @CurrentUser() user: JwtPayload) {
    // Workers and managers are scoped to their station
    const scopedStationId =
      [UserRole.WORKER, UserRole.STATION_MANAGER].includes(user.role as UserRole)
        ? user.stationId ?? undefined
        : stationId;

    return this.stockService.getTanks(scopedStationId);
  }

  // ── GET /stock/tanks/:id ──────────────────────────────────────────────────
  @Get('tanks/:id')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER, UserRole.WORKER)
  @ApiOperation({ summary: 'Get single tank details' })
  getTank(@Param('id') id: string) {
    return this.stockService.getTank(id);
  }

  // ── GET /stock/summary — all-station overview (back-office/admin) ─────────
  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'All-station stock summary for back-office dashboard' })
  getAllSummaries() {
    return this.stockService.getAllStationSummaries();
  }

  // ── GET /stock/summary/:stationId ─────────────────────────────────────────
  @Get('summary/:stationId')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Stock summary for a specific station' })
  getStationSummary(@Param('stationId') stationId: string) {
    return this.stockService.getStationSummary(stationId);
  }

  // ── POST /stock/movements — record delivery, dispensed, or adjustment ──────
  @Post('movements')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Record a stock movement (delivery, dispensed, adjustment)' })
  recordMovement(@Body() dto: RecordMovementDto, @CurrentUser() user: JwtPayload) {
    return this.stockService.recordMovement(dto, user.sub);
  }

  // ── GET /stock/movements — movement history with filters ──────────────────
  @Get('movements')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Query stock movement history' })
  getMovements(@Query() query: StockMovementQueryDto) {
    return this.stockService.getMovements(query);
  }

  // ── PATCH /stock/tanks/:id/reorder — update reorder settings ─────────────
  @Patch('tanks/:id/reorder')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Update reorder level and quantity for a tank' })
  updateReorder(@Param('id') id: string, @Body() dto: UpdateReorderDto) {
    return this.stockService.updateReorderSettings(id, dto);
  }

  // ── GET /stock/valuation/:stationId — LKAS 2 stock valuation ─────────────
  @Get('valuation/:stationId')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'LKAS 2 stock valuation (weighted avg cost) for a station' })
  getValuation(@Param('stationId') stationId: string) {
    return this.stockService.getStockValuation(stationId);
  }
}
