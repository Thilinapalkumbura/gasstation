import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ShiftType, UsageLogStatus } from '@gasstation/shared-types';

export class UsageQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tankId?: string;

  @ApiPropertyOptional({ enum: UsageLogStatus })
  @IsOptional()
  @IsEnum(UsageLogStatus)
  status?: UsageLogStatus;

  @ApiPropertyOptional({ enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-06-30' })
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
