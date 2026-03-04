import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { CarWashService } from './car-wash.service';
import { CreateCarWashJobDto } from './dto/create-car-wash-job.dto';
import { CarWashJobQueryDto } from './dto/car-wash-job-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@gasstation/shared-types';

@Controller('v1/car-wash')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CarWashController {
  constructor(private readonly service: CarWashService) {}

  @Post('jobs')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.ADMIN)
  createJob(@Body() dto: CreateCarWashJobDto, @CurrentUser() user: any) {
    return this.service.createJob(dto, user.sub);
  }

  @Get('jobs')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getJobs(@Query() query: CarWashJobQueryDto, @CurrentUser() user: any) {
    return this.service.getJobs(query, user.role, user.stationId ?? null);
  }

  @Get('summary')
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getSummary(
    @Query('stationId') stationId: string | undefined,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.getSummary(stationId, from, to);
  }
}
