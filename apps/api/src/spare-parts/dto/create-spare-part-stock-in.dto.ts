import { IsString, IsInt, IsPositive, IsNumber, IsOptional } from 'class-validator';

export class CreateSparePartStockInDto {
  @IsString()
  stationId: string;

  @IsString()
  sparePartId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  costPriceLkr: number;

  @IsOptional()
  @IsString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
