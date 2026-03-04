import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class UpdateReorderDto {
  @ApiPropertyOptional({ description: 'Tank capacity in litres', example: 30000 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  capacityLitres?: number;

  @ApiProperty({ description: 'Stock level (litres) that triggers a reorder alert', example: 8000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  reorderLevelLitres: number;

  @ApiProperty({ description: 'Quantity to order (litres) when reorder is triggered', example: 20000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  reorderQtyLitres: number;
}
