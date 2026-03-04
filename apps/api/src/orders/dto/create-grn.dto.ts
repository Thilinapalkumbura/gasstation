import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FuelType } from '@gasstation/shared-types';

export class GRNItemDto {
  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuelType: FuelType;

  @ApiProperty({ description: 'Ordered quantity from PO (litres)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  orderedQtyLitres: number;

  @ApiProperty({ description: 'Actual received quantity (litres)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  receivedQtyLitres: number;

  @ApiProperty({ description: 'Actual price per litre (LKR) on delivery docket' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  pricePerLitreLkr: number;
}

export class CreateGRNDto {
  @ApiProperty({ description: 'Purchase Order ID this GRN is against' })
  @IsString()
  purchaseOrderId: string;

  @ApiProperty({ example: '2024-06-22T10:30:00Z', description: 'Actual delivery date/time' })
  @IsDateString()
  receivedAt: string;

  @ApiProperty({ type: [GRNItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GRNItemDto)
  items: GRNItemDto[];

  @ApiPropertyOptional({ description: 'Delivery notes, docket number, driver details' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
