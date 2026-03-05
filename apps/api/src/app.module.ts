import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StationsModule } from './stations/stations.module';
import { StockModule } from './stock/stock.module';
import { UsageModule } from './usage/usage.module';
import { OrdersModule } from './orders/orders.module';
import { TaxModule } from './tax/tax.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './prisma/prisma.module';
import { validate } from './config/env.validation';
import { VehicleServicesModule } from './vehicle-services/vehicle-services.module';
import { CarWashModule } from './car-wash/car-wash.module';
import { SparePartsModule } from './spare-parts/spare-parts.module';
import { GasCylindersModule } from './gas-cylinders/gas-cylinders.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    // Config — load .env
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 300 },
    ]),

    // Cron jobs (for auto reorder alerts, tax computations)
    ScheduleModule.forRoot(),

    // Event bus for real-time stock updates
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 20 }),

    // Feature modules
    PrismaModule,
    AuthModule,
    UsersModule,
    StationsModule,
    StockModule,
    UsageModule,
    OrdersModule,
    TaxModule,
    ReportsModule,
    VehicleServicesModule,
    CarWashModule,
    SparePartsModule,
    GasCylindersModule,
    AlertsModule,
  ],
})
export class AppModule {}
