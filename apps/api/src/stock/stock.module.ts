import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { StockGateway } from './stock.gateway';

@Module({
  imports: [
    // JWT needed by the WebSocket gateway for auth
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [StockController],
  providers: [StockService, StockGateway],
  exports: [StockService],
})
export class StockModule {}
