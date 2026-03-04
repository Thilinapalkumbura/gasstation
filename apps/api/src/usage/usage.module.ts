import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageGateway } from './usage.gateway';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [
    StockModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UsageController],
  providers: [UsageService, UsageGateway],
  exports: [UsageService],
})
export class UsageModule {}
