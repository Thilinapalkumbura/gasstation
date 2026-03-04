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
import { UsageService } from './usage.service';
import { CreateUsageLogDto } from './dto/create-usage-log.dto';
import { RejectUsageLogDto } from './dto/approve-usage-log.dto';
import { UsageQueryDto } from './dto/usage-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, JwtPayload } from '@gasstation/shared-types';

@ApiTags('usage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'usage', version: '1' })
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  // ── POST /usage/logs — worker submits a shift ─────────────────────────────
  @Post('logs')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit a shift usage log' })
  createLog(@Body() dto: CreateUsageLogDto, @CurrentUser() user: JwtPayload) {
    return this.usageService.createLog(dto, user.sub, user.role, user.stationId);
  }

  // ── GET /usage/logs — query logs ──────────────────────────────────────────
  @Get('logs')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER, UserRole.WORKER)
  @ApiOperation({ summary: 'List usage logs (scoped by role)' })
  getLogs(@Query() query: UsageQueryDto, @CurrentUser() user: JwtPayload) {
    return this.usageService.getLogs(query, user.sub, user.role, user.stationId);
  }

  // ── GET /usage/logs/pending — pending approvals for managers ──────────────
  @Get('logs/pending')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Get all pending approval logs' })
  getPending(@CurrentUser() user: JwtPayload) {
    const query = new UsageQueryDto();
    query.status = 'PENDING' as any;
    if (user.role === UserRole.STATION_MANAGER && user.stationId) {
      query.stationId = user.stationId;
    }
    return this.usageService.getLogs(query, user.sub, user.role, user.stationId);
  }

  // ── GET /usage/logs/:id — single log ─────────────────────────────────────
  @Get('logs/:id')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER, UserRole.WORKER)
  @ApiOperation({ summary: 'Get a single usage log by ID' })
  getLog(@Param('id') id: string) {
    return this.usageService.getLog(id);
  }

  // ── PATCH /usage/logs/:id/approve — manager approves ─────────────────────
  @Patch('logs/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Approve a pending shift log (creates stock movement)' })
  approveLog(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usageService.approveLog(id, user.sub);
  }

  // ── PATCH /usage/logs/:id/reject — manager rejects with notes ────────────
  @Patch('logs/:id/reject')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Reject a shift log with reason (worker must resubmit)' })
  rejectLog(
    @Param('id') id: string,
    @Body() dto: RejectUsageLogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usageService.rejectLog(id, user.sub, dto);
  }

  // ── GET /usage/suggest-opening — pre-fill opening stock ──────────────────
  @Get('suggest-opening')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get suggested opening stock from previous shift' })
  @ApiQuery({ name: 'tankId', required: true })
  @ApiQuery({ name: 'shiftType', required: true })
  @ApiQuery({ name: 'date', required: true })
  getSuggestion(
    @Query('tankId') tankId: string,
    @Query('shiftType') shiftType: string,
    @Query('date') date: string,
  ) {
    return this.usageService.getOpeningStockSuggestion(tankId, shiftType, date);
  }

  // ── GET /usage/summary — daily totals per fuel type ──────────────────────
  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Daily usage summary (approved logs only) for a station' })
  @ApiQuery({ name: 'stationId', required: true })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getSummary(
    @Query('stationId') stationId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.usageService.getDailySummary(stationId, from, to);
  }

  // ── GET /usage/pending-count — badge count for manager ────────────────────
  @Get('pending-count')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Count of pending approvals for a station' })
  @ApiQuery({ name: 'stationId', required: true })
  getPendingCount(@Query('stationId') stationId: string) {
    return this.usageService.getPendingCount(stationId);
  }
}
