import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@gasstation/shared-types';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('income-statement')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'LKAS 1 Income Statement' })
  @ApiQuery({ name: 'stationId', required: false })
  @ApiQuery({ name: 'from', required: true, example: '2025-04-01' })
  @ApiQuery({ name: 'to', required: true, example: '2026-03-31' })
  getIncomeStatement(
    @Query('stationId') stationId: string | undefined,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getIncomeStatement(stationId, from, to);
  }

  @Get('cash-flow')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'LKAS 7 Cash Flow Statement (direct method)' })
  @ApiQuery({ name: 'stationId', required: false })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  getCashFlow(
    @Query('stationId') stationId: string | undefined,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportsService.getCashFlowStatement(stationId, from, to);
  }

  @Get('stock-valuation')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'LKAS 2 Stock Valuation (weighted average cost)' })
  @ApiQuery({ name: 'stationId', required: false })
  @ApiQuery({ name: 'date', required: true, example: '2025-12-31' })
  getStockValuation(
    @Query('stationId') stationId: string | undefined,
    @Query('date') date: string,
  ) {
    return this.reportsService.getStockValuation(stationId, date);
  }

  @Get('monthly-trend')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: '12-month trend for a Sri Lanka fiscal year' })
  @ApiQuery({ name: 'stationId', required: false })
  @ApiQuery({ name: 'fiscalYear', required: true, example: 2025 })
  getMonthlyTrend(
    @Query('stationId') stationId: string | undefined,
    @Query('fiscalYear') fiscalYear: string,
  ) {
    return this.reportsService.getMonthlyTrend(stationId, parseInt(fiscalYear, 10));
  }
}
