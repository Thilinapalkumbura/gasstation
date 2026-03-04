import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from 'class-validator';
import { StockMovementType } from '@gasstation/shared-types';

export class RecordMovementDto {
  @ApiProperty({ description: 'Tank ID to record movement against' })
  @IsString()
  tankId: string;

  @ApiProperty({ enum: StockMovementType })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({ description: 'Quantity in litres', example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantityLitres: number;

  @ApiPropertyOptional({ description: 'Unit cost per litre in LKR (for FIFO valuation)', example: 340.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  unitCostLkr?: number;

  @ApiPropertyOptional({ description: 'PO number, GRN number, shift reference, etc.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
