import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { RecordMovementDto } from './dto/record-movement.dto';
import { UpdateReorderDto } from './dto/update-reorder.dto';
import { StockMovementQueryDto } from './dto/stock-query.dto';
import { StockMovementType } from '@gasstation/shared-types';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Get all tanks for a station (or all stations for back-office) ──────────
  async getTanks(stationId?: string) {
    const tanks = await this.prisma.tank.findMany({
      where: stationId ? { stationId } : undefined,
      include: {
        station: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ stationId: 'asc' }, { fuelType: 'asc' }],
    });

    return tanks.map((t) => this.formatTank(t));
  }

  // ── Get single tank ────────────────────────────────────────────────────────
  async getTank(tankId: string) {
    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: { station: { select: { id: true, name: true, city: true } } },
    });
    if (!tank) throw new NotFoundException('Tank not found');
    return this.formatTank(tank);
  }

  // ── Get stock summary per station (for back-office overview) ───────────────
  async getStationSummary(stationId: string) {
    const tanks = await this.getTanks(stationId);
    const lowStock = tanks.filter((t) => t.isLow);
    const totalCapacity = tanks.reduce((s, t) => s + t.capacityLitres, 0);
    const totalCurrent = tanks.reduce((s, t) => s + t.currentLevelLitres, 0);

    return {
      stationId,
      tanks,
      totalCapacityLitres: totalCapacity,
      totalCurrentLitres: totalCurrent,
      overallPercentage: totalCapacity > 0 ? (totalCurrent / totalCapacity) * 100 : 0,
      lowStockCount: lowStock.length,
      lowStockTanks: lowStock,
    };
  }

  // ── Get summaries for ALL stations ────────────────────────────────────────
  async getAllStationSummaries() {
    const stations = await this.prisma.station.findMany({
      where: { isActive: true },
      select: { id: true, name: true, city: true },
    });
    return Promise.all(stations.map((s) => this.getStationSummary(s.id)));
  }

  // ── Record a stock movement (delivery, dispensed, adjustment) ──────────────
  async recordMovement(dto: RecordMovementDto, userId: string) {
    const tank = await this.prisma.tank.findUnique({ where: { id: dto.tankId } });
    if (!tank) throw new NotFoundException('Tank not found');

    // Validate: DISPENSED_OUT cannot exceed current stock
    const qty = new Decimal(dto.quantityLitres);
    if (
      dto.type === StockMovementType.DISPENSED_OUT &&
      qty.greaterThan(tank.currentLevelLitres)
    ) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${tank.currentLevelLitres}L, Requested: ${dto.quantityLitres}L`,
      );
    }

    // Calculate new balance
    let newBalance: Decimal;
    if (
      dto.type === StockMovementType.DELIVERY_IN ||
      dto.type === StockMovementType.OPENING_STOCK
    ) {
      newBalance = new Decimal(tank.currentLevelLitres).plus(qty);
    } else if (dto.type === StockMovementType.DISPENSED_OUT) {
      newBalance = new Decimal(tank.currentLevelLitres).minus(qty);
    } else {
      // ADJUSTMENT — qty can be positive (increase) or... use signed values from notes
      // For simplicity, ADJUSTMENT always sets the balance directly
      newBalance = qty;
    }

    // Enforce capacity limit for inbound movements
    if (newBalance.greaterThan(tank.capacityLitres)) {
      throw new BadRequestException(
        `Movement would exceed tank capacity of ${tank.capacityLitres}L`,
      );
    }

    // Persist movement + update tank atomically
    const [movement, updatedTank] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          tankId: dto.tankId,
          type: dto.type,
          quantityLitres: qty,
          balanceAfterLitres: newBalance,
          unitCostLkr: dto.unitCostLkr,
          reference: dto.reference,
          notes: dto.notes,
          createdById: userId,
        },
      }),
      this.prisma.tank.update({
        where: { id: dto.tankId },
        data: { currentLevelLitres: newBalance, lastUpdated: new Date() },
        include: { station: { select: { id: true, name: true, city: true } } },
      }),
    ]);

    const formatted = this.formatTank(updatedTank);

    // Emit real-time update event
    this.events.emit('stock.updated', formatted);

    // Check for low stock and emit alert
    if (formatted.isLow) {
      this.events.emit('stock.low', formatted);
    }

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: `STOCK_${dto.type}`,
        entityType: 'Tank',
        entityId: dto.tankId,
        newValues: {
          type: dto.type,
          quantityLitres: dto.quantityLitres,
          balanceAfterLitres: newBalance,
          reference: dto.reference,
        },
      },
    }).catch(() => {});

    return { movement, tank: formatted };
  }

  // ── Update reorder thresholds ──────────────────────────────────────────────
  async updateReorderSettings(tankId: string, dto: UpdateReorderDto) {
    const tank = await this.prisma.tank.findUnique({ where: { id: tankId } });
    if (!tank) throw new NotFoundException('Tank not found');

    const updated = await this.prisma.tank.update({
      where: { id: tankId },
      data: {
        ...(dto.capacityLitres !== undefined && { capacityLitres: dto.capacityLitres }),
        reorderLevelLitres: dto.reorderLevelLitres,
        reorderQtyLitres: dto.reorderQtyLitres,
      },
      include: { station: { select: { id: true, name: true, city: true } } },
    });

    return this.formatTank(updated);
  }

  // ── Get movement history ───────────────────────────────────────────────────
  async getMovements(query: StockMovementQueryDto) {
    const where: any = {};
    if (query.tankId) where.tankId = query.tankId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          tank: { select: { fuelType: true, station: { select: { name: true } } } },
          createdBy: { select: { fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit),
        skip: Number(query.offset),
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { items, total, limit: query.limit, offset: query.offset };
  }

  // ── FIFO stock valuation (LKAS 2) ──────────────────────────────────────────
  async getStockValuation(stationId: string) {
    const tanks = await this.prisma.tank.findMany({ where: { stationId } });

    const valuations = await Promise.all(
      tanks.map(async (tank) => {
        // Get all DELIVERY_IN movements with cost, ordered oldest first
        const deliveries = await this.prisma.stockMovement.findMany({
          where: {
            tankId: tank.id,
            type: StockMovementType.DELIVERY_IN,
            unitCostLkr: { not: null },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Calculate weighted average cost (simplified FIFO proxy)
        const totalQty = deliveries.reduce(
          (s, d) => s.plus(d.quantityLitres),
          new Decimal(0),
        );
        const totalCost = deliveries.reduce(
          (s, d) => s.plus(new Decimal(d.quantityLitres).times(d.unitCostLkr ?? 0)),
          new Decimal(0),
        );
        const avgCostPerLitre = totalQty.greaterThan(0)
          ? totalCost.dividedBy(totalQty)
          : new Decimal(0);
        const stockValue = avgCostPerLitre.times(tank.currentLevelLitres);

        return {
          tankId: tank.id,
          fuelType: tank.fuelType,
          currentLevelLitres: Number(tank.currentLevelLitres),
          avgCostPerLitreLkr: Number(avgCostPerLitre.toFixed(4)),
          stockValueLkr: Number(stockValue.toFixed(2)),
        };
      }),
    );

    const totalValueLkr = valuations.reduce((s, v) => s + v.stockValueLkr, 0);
    return { stationId, valuations, totalValueLkr };
  }

  // ── Scheduled: scan all tanks every 5 min, emit low-stock alerts ──────────
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkReorderLevels() {
    const lowTanks = await this.prisma.tank.findMany({
      where: {
        currentLevelLitres: { lte: this.prisma.tank.fields.reorderLevelLitres as any },
      },
      include: { station: { select: { id: true, name: true } } },
    });

    // Re-query properly (Prisma doesn't support column comparisons directly)
    const allTanks = await this.prisma.tank.findMany({
      include: { station: { select: { id: true, name: true, city: true } } },
    });
    const alertTanks = allTanks.filter((t) =>
      new Decimal(t.currentLevelLitres).lessThanOrEqualTo(t.reorderLevelLitres),
    );

    for (const tank of alertTanks) {
      this.events.emit('stock.low', this.formatTank(tank));
      this.logger.warn(
        `LOW STOCK: ${tank.station.name} — ${tank.fuelType}: ${tank.currentLevelLitres}L (reorder @ ${tank.reorderLevelLitres}L)`,
      );
    }
  }

  // ── Private: enrich tank with computed fields ─────────────────────────────
  private formatTank(tank: any) {
    const current = Number(tank.currentLevelLitres);
    const capacity = Number(tank.capacityLitres);
    const reorder = Number(tank.reorderLevelLitres);

    return {
      id: tank.id,
      stationId: tank.stationId,
      station: tank.station,
      fuelType: tank.fuelType,
      capacityLitres: capacity,
      currentLevelLitres: current,
      reorderLevelLitres: reorder,
      reorderQtyLitres: Number(tank.reorderQtyLitres),
      percentageFull: capacity > 0 ? Math.round((current / capacity) * 100) : 0,
      availableLitres: capacity - current,
      isLow: current <= reorder,
      isCritical: current <= reorder * 0.5,  // below 50% of reorder = critical
      lastUpdated: tank.lastUpdated,
    };
  }
}
