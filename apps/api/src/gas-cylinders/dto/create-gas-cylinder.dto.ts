import { IsString, IsEnum, IsNumber, IsPositive, IsOptional, IsInt, Min } from 'class-validator';
import { CylinderBrand } from '@gasstation/shared-types';

export class CreateGasCylinderDto {
  @IsString()
  stationId: string;

  @IsEnum(CylinderBrand)
  brand: CylinderBrand;

  @IsNumber()
  @IsPositive()
  sizeKg: number;

  @IsNumber()
  @IsPositive()
  sellingPriceLkr: number;

  @IsNumber()
  @IsPositive()
  purchasePriceLkr: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fullStock?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  emptyStock?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number = 5;
}
