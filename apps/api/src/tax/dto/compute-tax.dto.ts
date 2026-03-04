import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TaxType } from '@gasstation/shared-types';

export class ComputeTaxDto {
  @ApiPropertyOptional({ example: 'clxxx...', description: 'Station ID (optional — omit for all stations)' })
  @IsOptional()
  @IsString()
  stationId?: string;

  @ApiProperty({ enum: TaxType })
  @IsEnum(TaxType)
  taxType: TaxType;

  @ApiProperty({ example: 4, description: 'Calendar month (1=Jan, 12=Dec)' })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ example: 2025 })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}
