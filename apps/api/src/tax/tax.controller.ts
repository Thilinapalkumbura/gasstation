import {
  BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { ComputeTaxDto } from './dto/compute-tax.dto';
import { TaxQueryDto } from './dto/tax-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@gasstation/shared-types';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class MarkPaidDto {
  @ApiProperty({ example: 'IRD-2025-04-001' })
  @IsString()
  filingReference: string;
}

@ApiTags('tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'tax', version: '1' })
export class TaxController {
  constructor(private readonly taxService: TaxService) {}

  @Post('compute')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'Trigger tax computation for a given period' })
  async compute(@Body() dto: ComputeTaxDto) {
    if (!dto.stationId) {
      throw new BadRequestException('stationId is required for tax computation');
    }
    if (dto.taxType === 'VAT') {
      return this.taxService.computeVAT(dto.stationId, dto.month, dto.year);
    }
    if (dto.taxType === 'WHT') {
      return this.taxService.computeWHT(dto.stationId, dto.month, dto.year);
    }
    if (dto.taxType === 'INCOME_TAX') {
      return this.taxService.getIncomeTaxEstimate(dto.stationId, dto.year);
    }
    return { message: `Tax type ${dto.taxType} not yet implemented` };
  }

  @Get('entries')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'List tax entries with optional filters' })
  getEntries(@Query() query: TaxQueryDto) {
    return this.taxService.getTaxEntries(query);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'Aggregated tax summary for a calendar year' })
  @ApiQuery({ name: 'stationId', required: true })
  @ApiQuery({ name: 'year', required: true })
  getSummary(
    @Query('stationId') stationId: string,
    @Query('year') year: string,
  ) {
    return this.taxService.getTaxSummary(stationId, parseInt(year, 10));
  }

  @Get('vat-return')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'IRD VAT-01 return detail for a month' })
  @ApiQuery({ name: 'stationId', required: true })
  @ApiQuery({ name: 'month', required: true })
  @ApiQuery({ name: 'year', required: true })
  getVATReturn(
    @Query('stationId') stationId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.taxService.getVATReturn(
      stationId,
      parseInt(month, 10),
      parseInt(year, 10),
    );
  }

  @Patch('entries/:id/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'Mark a tax entry as paid' })
  markPaid(@Param('id') id: string, @Body() dto: MarkPaidDto) {
    return this.taxService.markPaid(id, dto.filingReference);
  }
}
