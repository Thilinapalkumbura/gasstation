import { IsString, IsEnum, IsNumber, IsPositive, IsOptional, IsDateString } from 'class-validator';
import { CarWashType, PaymentMethod } from '@gasstation/shared-types';

export class CreateCarWashJobDto {
  @IsString()
  stationId: string;

  @IsString()
  vehicleNumber: string;

  @IsEnum(CarWashType)
  washType: CarWashType;

  @IsNumber()
  @IsPositive()
  amountLkr: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsDateString()
  washDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
