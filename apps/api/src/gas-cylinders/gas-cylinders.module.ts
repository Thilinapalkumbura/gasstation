import { Module } from '@nestjs/common';
import { GasCylindersController } from './gas-cylinders.controller';
import { GasCylindersService } from './gas-cylinders.service';

@Module({
  controllers: [GasCylindersController],
  providers: [GasCylindersService],
  exports: [GasCylindersService],
})
export class GasCylindersModule {}
