import { IsString, IsEnum, IsNumber, IsPositive, IsOptional, IsDateString } from 'class-validator';
import { VehicleServiceType, PaymentMethod } from '@gasstation/shared-types';

export class CreateServiceJobDto {
  @IsString()
  stationId: string;

  @IsString()
  vehicleNumber: string;

  @IsEnum(VehicleServiceType)
  serviceType: VehicleServiceType;

  @IsNumber()
  @IsPositive()
  amountLkr: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsDateString()
  serviceDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
