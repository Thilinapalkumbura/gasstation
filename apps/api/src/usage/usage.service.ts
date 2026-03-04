import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { CreateUsageLogDto } from './dto/create-usage-log.dto';
import { RejectUsageLogDto } from './dto/approve-usage-log.dto';
import { UsageQueryDto } from './dto/usage-query.dto';
import {
  UsageLogStatus,
  UserRole,
  StockMovementType,
  VARIANCE_WARNING_LITRES,
  VARIANCE_CRITICAL_LITRES,
} from '@gasstation/shared-types';

// Full log include shape reused throughout
const LOG_INCLUDE = {
  tank: {
    select: {
      fuelType: true,
      capacityLitres: true,
      reorderLevelLitres: true,
      station: { select: { id: true, name: true, city: true } },
    },
  },
  recordedBy: { select: { id: true, fullName: true, role: true } },
  approvedBy: { select: { id: true, fullName: true, role: true } },
} as const;

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Submit a new shift log (worker) ───────────────────────────────────────
  async createLog(dto: CreateUsageLogDto, userId: string, userRole: string, userStationId: string | null) {
    // Verify tank exists and belongs to this worker's station
    const tank = await this.prisma.tank.findUnique({
      where: { id: dto.tankId },
      include: { station: { select: { id: true, name: true } } },
    });
    if (!tank) throw new NotFoundException('Tank not found');

    if (userRole === UserRole.WORKER && tank.stationId !== userStationId) {
      throw new ForbiddenException('You can only log usage for your assigned station');
    }

    // Check for duplicate (same tank + shift + date)
    const exists = await this.prisma.dailyUsageLog.findUnique({
      where: {
        tankId_shiftType_date: {
          tankId: dto.tankId,
          shiftType: dto.shiftType,
          date: new Date(dto.date),
        },
      },
    });
    if (exists) {
      if (exists.status === UsageLogStatus.REJECTED) {
        // Worker resubmitting a rejected entry — update it
        return this.resubmitLog(exists.id, dto, userId);
      }
      throw new ConflictException(
        `A ${dto.shiftType} shift log for this tank on ${dto.date} already exists (status: ${exists.status})`,
      );
    }

    // Validate meter readings
    if (dto.closingMeterReading < dto.openingMeterReading) {
      throw new BadRequestException('Closing meter reading cannot be less than opening meter reading');
    }

    // ── Calculate derived fields ──────────────────────────────────────────
    const dispensedLitres = new Decimal(dto.closingMeterReading).minus(dto.openingMeterReading);
    const physicalDispensedLitres = new Decimal(dto.openingStockLitres).minus(dto.closingStockLitres);
    const varianceLitres = dispensedLitres.minus(physicalDispensedLitres);
    const absVariance = varianceLitres.abs();
    const isVarianceHigh = absVariance.greaterThan(VARIANCE_WARNING_LITRES);
    const totalSalesLkr = new Decimal(dto.cashSalesLkr).plus(dto.creditSalesLkr);

    if (absVariance.greaterThan(VARIANCE_CRITICAL_LITRES)) {
      this.logger.warn(
        `High variance detected: tank ${dto.tankId}, shift ${dto.shiftType} on ${dto.date} — variance ${varianceLitres}L`,
      );
    }

    const log = await this.prisma.dailyUsageLog.create({
      data: {
        tankId: dto.tankId,
        shiftType: dto.shiftType,
        date: new Date(dto.date),
        status: UsageLogStatus.PENDING,
        openingMeterReading: dto.openingMeterReading,
        closingMeterReading: dto.closingMeterReading,
        openingStockLitres: dto.openingStockLitres,
        closingStockLitres: dto.closingStockLitres,
        dispensedLitres,
        physicalDispensedLitres,
        cashSalesLkr: dto.cashSalesLkr,
        creditSalesLkr: dto.creditSalesLkr,
        totalSalesLkr,
        pricePerLitreLkr: dto.pricePerLitreLkr,
        varianceLitres,
        isVarianceHigh,
        workerNotes: dto.workerNotes,
        recordedById: userId,
      },
      include: LOG_INCLUDE,
    });

    // Notify managers in real-time
    this.events.emit('usage.submitted', log);

    await this.auditLog(userId, 'USAGE_SUBMITTED', 'DailyUsageLog', log.id);

    return this.formatLog(log);
  }

  // ── Resubmit a previously rejected log ────────────────────────────────────
  private async resubmitLog(logId: string, dto: CreateUsageLogDto, userId: string) {
    const dispensedLitres = new Decimal(dto.closingMeterReading).minus(dto.openingMeterReading);
    const physicalDispensedLitres = new Decimal(dto.openingStockLitres).minus(dto.closingStockLitres);
    const varianceLitres = dispensedLitres.minus(physicalDispensedLitres);
    const isVarianceHigh = varianceLitres.abs().greaterThan(VARIANCE_WARNING_LITRES);
    const totalSalesLkr = new Decimal(dto.cashSalesLkr).plus(dto.creditSalesLkr);

    const log = await this.prisma.dailyUsageLog.update({
      where: { id: logId },
      data: {
        status: UsageLogStatus.PENDING,
        openingMeterReading: dto.openingMeterReading,
        closingMeterReading: dto.closingMeterReading,
        openingStockLitres: dto.openingStockLitres,
        closingStockLitres: dto.closingStockLitres,
        dispensedLitres,
        physicalDispensedLitres,
        cashSalesLkr: dto.cashSalesLkr,
        creditSalesLkr: dto.creditSalesLkr,
        totalSalesLkr,
        pricePerLitreLkr: dto.pricePerLitreLkr,
        varianceLitres,
        isVarianceHigh,
        workerNotes: dto.workerNotes,
        rejectionNotes: null,
        recordedById: userId,
      },
      include: LOG_INCLUDE,
    });

    this.events.emit('usage.submitted', log);
    return this.formatLog(log);
  }

  // ── Approve a shift log (manager/back-office) ──────────────────────────────
  async approveLog(logId: string, approverId: string) {
    const log = await this.prisma.dailyUsageLog.findUnique({
      where: { id: logId },
      include: LOG_INCLUDE,
    });
    if (!log) throw new NotFoundException('Usage log not found');
    if (log.status === UsageLogStatus.APPROVED) {
      throw new ConflictException('This log has already been approved');
    }
    if (log.status !== UsageLogStatus.PENDING) {
      throw new BadRequestException(`Cannot approve a log with status: ${log.status}`);
    }

    // Create official DISPENSED_OUT stock movement for the meter-based dispensed amount
    const { movement } = await this.stockService.recordMovement(
      {
        tankId: log.tankId,
        type: StockMovementType.DISPENSED_OUT,
        quantityLitres: Number(log.dispensedLitres),
        reference: `SHIFT-${log.id}`,
        notes: `${log.shiftType} shift on ${log.date.toISOString().slice(0, 10)} approved by ${approverId}`,
      },
      approverId,
    );

    const approved = await this.prisma.dailyUsageLog.update({
      where: { id: logId },
      data: {
        status: UsageLogStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
        stockMovementId: movement.id,
      },
      include: LOG_INCLUDE,
    });

    this.events.emit('usage.approved', { log: this.formatLog(approved), workerId: log.recordedById });
    await this.auditLog(approverId, 'USAGE_APPROVED', 'DailyUsageLog', logId);

    return this.formatLog(approved);
  }

  // ── Reject a shift log (manager/back-office) ──────────────────────────────
  async rejectLog(logId: string, approverId: string, dto: RejectUsageLogDto) {
    const log = await this.prisma.dailyUsageLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Usage log not found');
    if (log.status === UsageLogStatus.APPROVED) {
      throw new ConflictException('Cannot reject an already approved log');
    }

    const rejected = await this.prisma.dailyUsageLog.update({
      where: { id: logId },
      data: {
        status: UsageLogStatus.REJECTED,
        rejectionNotes: dto.rejectionNotes,
        approvedById: approverId,
      },
      include: LOG_INCLUDE,
    });

    this.events.emit('usage.rejected', { log: this.formatLog(rejected), workerId: log.recordedById });
    await this.auditLog(approverId, 'USAGE_REJECTED', 'DailyUsageLog', logId, dto.rejectionNotes);

    return this.formatLog(rejected);
  }

  // ── Get all logs with filters ─────────────────────────────────────────────
  async getLogs(query: UsageQueryDto, userId: string, userRole: string, userStationId: string | null) {
    const where: any = {};

    // Workers can only see their own submissions
    if (userRole === UserRole.WORKER) {
      where.recordedById = userId;
    } else if (userRole === UserRole.STATION_MANAGER && userStationId) {
      where.tank = { stationId: userStationId };
    }

    if (query.stationId && [UserRole.ADMIN, UserRole.BACK_OFFICE].includes(userRole as UserRole)) {
      where.tank = { ...where.tank, stationId: query.stationId };
    }
    if (query.tankId) where.tankId = query.tankId;
    if (query.status) where.status = query.status;
    if (query.shiftType) where.shiftType = query.shiftType;
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.dailyUsageLog.findMany({
        where,
        include: LOG_INCLUDE,
        orderBy: [{ date: 'desc' }, { shiftType: 'asc' }],
        take: Number(query.limit),
        skip: Number(query.offset),
      }),
      this.prisma.dailyUsageLog.count({ where }),
    ]);

    return { items: items.map(this.formatLog), total };
  }

  // ── Get single log ────────────────────────────────────────────────────────
  async getLog(logId: string) {
    const log = await this.prisma.dailyUsageLog.findUnique({
      where: { id: logId },
      include: LOG_INCLUDE,
    });
    if (!log) throw new NotFoundException('Usage log not found');
    return this.formatLog(log);
  }

  // ── Pending count per station (for manager badge) ─────────────────────────
  async getPendingCount(stationId: string) {
    return this.prisma.dailyUsageLog.count({
      where: {
        status: UsageLogStatus.PENDING,
        tank: { stationId },
      },
    });
  }

  // ── Daily summary (totals per fuel type per day) ──────────────────────────
  async getDailySummary(stationId: string, from: string, to: string) {
    const logs = await this.prisma.dailyUsageLog.findMany({
      where: {
        tank: { stationId },
        status: UsageLogStatus.APPROVED,
        date: { gte: new Date(from), lte: new Date(to) },
      },
      include: { tank: { select: { fuelType: true } } },
      orderBy: { date: 'asc' },
    });

    // Group by date + fuelType
    const grouped: Record<string, Record<string, {
      dispensedLitres: number;
      totalSalesLkr: number;
      cashSalesLkr: number;
      creditSalesLkr: number;
      varianceLitres: number;
    }>> = {};

    for (const log of logs) {
      const dateKey = log.date.toISOString().slice(0, 10);
      const fuelKey = log.tank.fuelType;
      if (!grouped[dateKey]) grouped[dateKey] = {};
      if (!grouped[dateKey][fuelKey]) {
        grouped[dateKey][fuelKey] = {
          dispensedLitres: 0,
          totalSalesLkr: 0,
          cashSalesLkr: 0,
          creditSalesLkr: 0,
          varianceLitres: 0,
        };
      }
      const g = grouped[dateKey][fuelKey];
      g.dispensedLitres += Number(log.dispensedLitres);
      g.totalSalesLkr += Number(log.totalSalesLkr);
      g.cashSalesLkr += Number(log.cashSalesLkr);
      g.creditSalesLkr += Number(log.creditSalesLkr);
      g.varianceLitres += Number(log.varianceLitres);
    }

    return Object.entries(grouped).map(([date, fuels]) => ({
      date,
      fuels,
      dayTotalLitres: Object.values(fuels).reduce((s, f) => s + f.dispensedLitres, 0),
      dayTotalSalesLkr: Object.values(fuels).reduce((s, f) => s + f.totalSalesLkr, 0),
    }));
  }

  // ── Pre-fill helper: get opening stock for next shift ─────────────────────
  async getOpeningStockSuggestion(tankId: string, shiftType: string, date: string) {
    // Try to find the previous shift's closing stock
    const shiftOrder = ['MORNING', 'EVENING', 'NIGHT'];
    const currentIdx = shiftOrder.indexOf(shiftType);

    let prevLog: any = null;

    if (currentIdx > 0) {
      // Look for the previous shift on the same day
      prevLog = await this.prisma.dailyUsageLog.findUnique({
        where: {
          tankId_shiftType_date: {
            tankId,
            shiftType: shiftOrder[currentIdx - 1] as any,
            date: new Date(date),
          },
        },
      });
    }

    if (!prevLog) {
      // Look for last approved log on a previous date
      prevLog = await this.prisma.dailyUsageLog.findFirst({
        where: {
          tankId,
          status: UsageLogStatus.APPROVED,
          date: { lt: new Date(date) },
        },
        orderBy: [{ date: 'desc' }, { shiftType: 'desc' }],
      });
    }

    // Fall back to current tank level
    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      select: { currentLevelLitres: true },
    });

    return {
      openingStockLitres: prevLog
        ? Number(prevLog.closingStockLitres)
        : Number(tank?.currentLevelLitres ?? 0),
      source: prevLog ? 'previous_shift' : 'tank_current_level',
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private formatLog(log: any) {
    const absVariance = Math.abs(Number(log.varianceLitres));
    return {
      id: log.id,
      tankId: log.tankId,
      tank: log.tank,
      shiftType: log.shiftType,
      date: log.date,
      status: log.status,
      openingMeterReading: Number(log.openingMeterReading),
      closingMeterReading: Number(log.closingMeterReading),
      openingStockLitres: Number(log.openingStockLitres),
      closingStockLitres: Number(log.closingStockLitres),
      dispensedLitres: Number(log.dispensedLitres),
      physicalDispensedLitres: Number(log.physicalDispensedLitres),
      cashSalesLkr: Number(log.cashSalesLkr),
      creditSalesLkr: Number(log.creditSalesLkr),
      totalSalesLkr: Number(log.totalSalesLkr),
      pricePerLitreLkr: Number(log.pricePerLitreLkr),
      varianceLitres: Number(log.varianceLitres),
      isVarianceHigh: log.isVarianceHigh,
      varianceSeverity:
        absVariance > VARIANCE_CRITICAL_LITRES
          ? 'critical'
          : absVariance > VARIANCE_WARNING_LITRES
          ? 'warning'
          : 'ok',
      workerNotes: log.workerNotes,
      rejectionNotes: log.rejectionNotes,
      recordedBy: log.recordedBy,
      approvedBy: log.approvedBy,
      approvedAt: log.approvedAt,
      stockMovementId: log.stockMovementId,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    };
  }

  private async auditLog(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: string,
  ) {
    await this.prisma.auditLog
      .create({ data: { userId, action, entityType, entityId, newValues: details ? { details } : undefined } })
      .catch(() => {});
  }
}
