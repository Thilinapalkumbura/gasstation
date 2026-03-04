import { IsString, IsInt, IsPositive, IsNumber, IsOptional } from 'class-validator';

export class CreateCylinderStockInDto {
  @IsString()
  stationId: string;

  @IsString()
  gasCylinderId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  purchasePriceLkr: number;

  @IsOptional()
  @IsString()
  receivedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
