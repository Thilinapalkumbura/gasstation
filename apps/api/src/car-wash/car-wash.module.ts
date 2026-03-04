import { Module } from '@nestjs/common';
import { CarWashController } from './car-wash.controller';
import { CarWashService } from './car-wash.service';

@Module({
  controllers: [CarWashController],
  providers: [CarWashService],
  exports: [CarWashService],
})
export class CarWashModule {}
