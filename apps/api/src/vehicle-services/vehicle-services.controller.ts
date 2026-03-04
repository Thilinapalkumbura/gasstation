import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { VehicleServicesService } from './vehicle-services.service';
import { CreateServiceJobDto } from './dto/create-service-job.dto';
import { ServiceJobQueryDto } from './dto/service-job-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@gasstation/shared-types';

@Controller('v1/vehicle-services')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleServicesController {
  constructor(private readonly service: VehicleServicesService) {}

  @Post('jobs')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.ADMIN)
  createJob(@Body() dto: CreateServiceJobDto, @CurrentUser() user: any) {
    return this.service.createJob(dto, user.sub);
  }

  @Get('jobs')
  @Roles(UserRole.WORKER, UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getJobs(@Query() query: ServiceJobQueryDto, @CurrentUser() user: any) {
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
