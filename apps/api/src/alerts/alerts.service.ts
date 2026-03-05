import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AlertType } from '@gasstation/database';

export interface AlertQueryDto {
  stationId?: string;
  type?: AlertType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('stock.low')
  async handleTankLow(event: any) {
    await this.prisma.alertHistory.create({
      data: {
        type: 'FUEL_TANK' as AlertType,
        stationId: event.stationId,
        entityId: event.id,
        entityName: event.fuelType,
        currentStock: event.currentLevelLitres,
        reorderLevel: event.reorderLevelLitres,
        isCritical: event.isCritical ?? false,
      },
    }).catch(() => {});
  }

  @OnEvent('spareParts.low')
  async handleSparePartLow(event: any) {
    await this.prisma.alertHistory.create({
      data: {
        type: 'SPARE_PART' as AlertType,
        stationId: event.stationId,
        entityId: event.partId,
        entityName: `${event.name} (${event.sku})`,
        currentStock: event.currentStock,
        reorderLevel: event.reorderLevel,
        isCritical: event.isCritical ?? false,
      },
    }).catch(() => {});
  }

  @OnEvent('cylinder.low')
  async handleCylinderLow(event: any) {
    await this.prisma.alertHistory.create({
      data: {
        type: 'GAS_CYLINDER' as AlertType,
        stationId: event.stationId,
        entityId: event.cylinderId,
        entityName: `${event.brand} ${event.sizeKg}kg`,
        currentStock: event.fullStock,
        reorderLevel: event.reorderLevel,
        isCritical: event.isCritical ?? false,
      },
    }).catch(() => {});
  }

  async getAlerts(query: AlertQueryDto, userRole: string, userStationId?: string) {
    const page = Number(query.page ?? 1);
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const stationId =
      userRole === 'STATION_MANAGER' ? userStationId : query.stationId;

    const where: any = {};
    if (stationId) where.stationId = stationId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [total, items] = await Promise.all([
      this.prisma.alertHistory.count({ where }),
      this.prisma.alertHistory.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
