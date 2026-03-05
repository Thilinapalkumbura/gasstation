import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AlertsService, AlertQueryDto } from './alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@gasstation/shared-types';

@Controller('v1/alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  @Roles(UserRole.STATION_MANAGER, UserRole.BACK_OFFICE, UserRole.ADMIN)
  getAlerts(@Query() query: AlertQueryDto, @CurrentUser() user: any) {
    return this.service.getAlerts(query, user.role, user.stationId);
  }
}
