import { IsString, IsNumber, IsPositive, IsOptional, IsInt, Min } from 'class-validator';

export class CreateSparePartDto {
  @IsString()
  stationId: string;

  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @IsPositive()
  unitPriceLkr: number;

  @IsNumber()
  @IsPositive()
  costPriceLkr: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  reorderLevel?: number = 5;
}
