import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@gasstation/shared-types';

export class OrderQueryDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  stationId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional() @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number = 50;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  offset?: number = 0;
}
