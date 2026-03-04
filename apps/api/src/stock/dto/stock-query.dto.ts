import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { FuelType, StockMovementType } from '@gasstation/shared-types';

export class StockMovementQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tankId?: string;

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  offset?: number = 0;
}
