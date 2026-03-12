import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WorkerChangesService } from './worker-changes.service';
import { CreateWorkerChangeDto } from './dto/create-worker-change.dto';
import { ReviewWorkerChangeDto } from './dto/review-worker-change.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@gasstation/shared-types';

@Controller('v1/worker-changes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkerChangesController {
  constructor(private readonly service: WorkerChangesService) {}

  @Post()
  @Roles(UserRole.BACK_OFFICE, UserRole.ADMIN)
  createRequest(@Body() dto: CreateWorkerChangeDto, @CurrentUser() user: any) {
    return this.service.createRequest(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.BACK_OFFICE, UserRole.STATION_MANAGER, UserRole.ADMIN)
  getRequests(
    @Query('status') status?: string,
    @Query('workerId') workerId?: string,
    @CurrentUser() user?: any,
  ) {
    return this.service.getRequests(
      { status, workerId },
      user.role,
      user.stationId ?? null,
      user.sub,
    );
  }

  @Patch(':id/approve')
  @Roles(UserRole.STATION_MANAGER, UserRole.ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.approve(id, user.sub);
  }

  @Patch(':id/reject')
  @Roles(UserRole.STATION_MANAGER, UserRole.ADMIN)
  reject(@Param('id') id: string, @Body() dto: ReviewWorkerChangeDto, @CurrentUser() user: any) {
    return this.service.reject(id, user.sub, dto);
  }
}
