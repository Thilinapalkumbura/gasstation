import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ShiftType } from '@gasstation/shared-types';

export class CreateUsageLogDto {
  @ApiProperty({ description: 'Tank ID' })
  @IsString()
  tankId: string;

  @ApiProperty({ enum: ShiftType })
  @IsEnum(ShiftType)
  shiftType: ShiftType;

  @ApiProperty({ description: 'Shift date (YYYY-MM-DD)', example: '2024-06-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Pump meter reading at start of shift', example: 123456.78 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingMeterReading: number;

  @ApiProperty({ description: 'Pump meter reading at end of shift', example: 124567.89 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closingMeterReading: number;

  @ApiProperty({ description: 'Physical dip/tank reading at start of shift (litres)', example: 18000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingStockLitres: number;

  @ApiProperty({ description: 'Physical dip/tank reading at end of shift (litres)', example: 16900 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closingStockLitres: number;

  @ApiProperty({ description: 'Fuel price per litre at time of shift (LKR)', example: 340.0 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  pricePerLitreLkr: number;

  @ApiProperty({ description: 'Cash sales collected during shift (LKR)', example: 350000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cashSalesLkr: number;

  @ApiProperty({ description: 'Credit sales during shift (LKR)', example: 25000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditSalesLkr: number;

  @ApiPropertyOptional({ description: 'Any notes from the worker' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  workerNotes?: string;
}
