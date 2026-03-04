import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@gasstation/shared-types';
import { StationsService } from './stations.service';

@ApiTags('stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active stations' })
  findAll() {
    return this.stationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a station with its tanks' })
  findOne(@Param('id') id: string) {
    return this.stationsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new station (Admin only)' })
  create(
    @Body() body: { name: string; address: string; city: string; contactNumber?: string },
  ) {
    return this.stationsService.create(body);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a station (Admin only)' })
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; address: string; city: string; contactNumber: string; isActive: boolean }>,
  ) {
    return this.stationsService.update(id, body);
  }
}
