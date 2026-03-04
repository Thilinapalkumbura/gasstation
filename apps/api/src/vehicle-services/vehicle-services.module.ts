import { Module } from '@nestjs/common';
import { VehicleServicesController } from './vehicle-services.controller';
import { VehicleServicesService } from './vehicle-services.service';

@Module({
  controllers: [VehicleServicesController],
  providers: [VehicleServicesService],
  exports: [VehicleServicesService],
})
export class VehicleServicesModule {}
