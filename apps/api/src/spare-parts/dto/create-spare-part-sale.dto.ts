import { IsString, IsEnum, IsArray, ValidateNested, IsInt, IsPositive, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@gasstation/shared-types';

export class SaleItemDto {
  @IsString()
  sparePartId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPriceLkr: number;
}

export class CreateSparePartSaleDto {
  @IsString()
  stationId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsDateString()
  saleDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
