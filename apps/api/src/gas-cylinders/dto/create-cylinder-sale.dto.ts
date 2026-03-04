import { IsString, IsEnum, IsBoolean, IsInt, IsPositive, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { PaymentMethod } from '@gasstation/shared-types';

export class CreateCylinderSaleDto {
  @IsString()
  stationId: string;

  @IsString()
  gasCylinderId: string;

  @IsBoolean()
  isExchange: boolean;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  amountLkr: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsDateString()
  saleDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
