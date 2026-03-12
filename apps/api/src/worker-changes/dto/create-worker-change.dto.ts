import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { WorkerType } from '@gasstation/shared-types';

export class CreateWorkerChangeDto {
  @IsString()
  workerId: string;

  @IsOptional()
  @IsEnum(WorkerType)
  newWorkerType?: WorkerType;

  @IsOptional()
  @IsString()
  newFullName?: string;

  @IsOptional()
  @IsString()
  newStationId?: string;

  @IsOptional()
  @IsBoolean()
  newIsActive?: boolean;
}
