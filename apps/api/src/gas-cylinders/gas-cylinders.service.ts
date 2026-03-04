import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGasCylinderDto } from './dto/create-gas-cylinder.dto';
import { UpdateGasCylinderDto } from './dto/update-gas-cylinder.dto';
import { CreateCylinderSaleDto } from './dto/create-cylinder-sale.dto';
import { CreateCylinderStockInDto } from './dto/create-cylinder-stock-in.dto';
import { GasCylinderQueryDto } from './dto/gas-cylinder-query.dto';
import { TransactionCategory } from '@gasstation/shared-types';

@Injectable()
export class GasCylindersService {
  private readonly logger = new Logger(GasCylindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  private getFiscalPeriod(date: Date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const fiscalMonth = month >= 4 ? month - 3 : month + 9;
    const fiscalYear = month >= 4 ? year : year - 1;
    return { year: fiscalYear, month: fiscalMonth };
  }

  // ─── Catalog ──────────────────────────────────────────────────────────────

  async createCylinder(dto: CreateGasCylinderDto) {
    const station = await this.prisma.station.findUnique({ where: { id: dto.stationId } });
    if (!station) throw new NotFoundException('Station not found');

    return this.prisma.gasCylinder.create({ data: dto });
  }

  async getCylinders(query: GasCylinderQueryDto, userStationId?: string | null) {
    const where: any = { isActive: true };
    const stationId = userStationId ?? query.stationId;
    if (stationId) where.stationId = stationId;

    return this.prisma.gasCylinder.findMany({
      where,
      include: { station: { select: { id: true, name: true } } },
      orderBy: [{ brand: 'asc' }, { sizeKg: 'asc' }],
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    });
  }

  async getLowStock(stationId?: string) {
    const cylinders = await this.prisma.gasCylinder.findMany({
      where: stationId ? { stationId, isActive: true } : { isActive: true },
      include: { station: { select: { id: true, name: true } } },
    });
    return cylinders.filter((c) => c.fullStock <= c.reorderLevel);
  }

  async updateCylinder(id: string, dto: UpdateGasCylinderDto) {
    const cylinder = await this.prisma.gasCylinder.findUnique({ where: { id } });
    if (!cylinder) throw new NotFoundException('Gas cylinder not found');
    return this.prisma.gasCylinder.update({ where: { id }, data: dto });
  }

  // ─── Sales ────────────────────────────────────────────────────────────────

  async createSale(dto: CreateCylinderSaleDto, userId: string) {
    const cylinder = await this.prisma.gasCylinder.findUnique({ where: { id: dto.gasCylinderId } });
    if (!cylinder) throw new NotFoundException('Gas cylinder not found');

    if (cylinder.fullStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient full stock: available ${cylinder.fullStock}, requested ${dto.quantity}`,
      );
    }

    const saleDate = new Date(dto.saleDate);
    const fiscal = this.getFiscalPeriod(saleDate);

    const result = await this.prisma.$transaction(async (tx) => {
      // Update stock: full -= qty; if exchange: empty += qty
      await tx.gasCylinder.update({
        where: { id: dto.gasCylinderId },
        data: {
          fullStock: { decrement: dto.quantity },
          ...(dto.isExchange ? { emptyStock: { increment: dto.quantity } } : {}),
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          stationId: dto.stationId,
          category: TransactionCategory.GAS_CYLINDER_SALE,
          description: `Gas cylinder sale — ${cylinder.brand} ${cylinder.sizeKg}kg x${dto.quantity} (${dto.isExchange ? 'exchange' : 'new'})`,
          amountLkr: dto.amountLkr,
          vatAmountLkr: 0,
          netAmountLkr: dto.amountLkr,
          paymentMethod: dto.paymentMethod,
          transactionDate: saleDate,
          fiscalYear: fiscal.year,
          fiscalMonth: fiscal.month,
          createdById: userId,
        },
      });

      return tx.cylinderSale.create({
        data: {
          stationId: dto.stationId,
          gasCylinderId: dto.gasCylinderId,
          isExchange: dto.isExchange,
          quantity: dto.quantity,
          amountLkr: dto.amountLkr,
          paymentMethod: dto.paymentMethod,
          saleDate,
          notes: dto.notes,
          createdById: userId,
          transactionId: transaction.id,
        },
        include: {
          gasCylinder: { select: { id: true, brand: true, sizeKg: true } },
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });
    });

    // Check reorder level after transaction commits
    await this.emitLowStockForCylinder(dto.gasCylinderId);

    return result;
  }

  private async emitLowStockForCylinder(cylinderId: string) {
    const cyl = await this.prisma.gasCylinder.findUnique({
      where: { id: cylinderId },
      include: { station: { select: { id: true, name: true } } },
    });
    if (cyl && cyl.fullStock <= cyl.reorderLevel) {
      this.events.emit('cylinder.low', {
        cylinderId: cyl.id,
        stationId: cyl.stationId,
        stationName: (cyl as any).station?.name,
        brand: cyl.brand,
        sizeKg: Number(cyl.sizeKg),
        fullStock: cyl.fullStock,
        reorderLevel: cyl.reorderLevel,
        isCritical: cyl.fullStock === 0,
      });
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkReorderLevels() {
    const lowCylinders = await this.getLowStock();
    if (!lowCylinders.length) return;
    this.logger.warn(`[Cron] ${lowCylinders.length} cylinder(s) below reorder level`);
    for (const cyl of lowCylinders) {
      this.events.emit('cylinder.low', {
        cylinderId: cyl.id,
        stationId: cyl.stationId,
        stationName: (cyl as any).station?.name,
        brand: cyl.brand,
        sizeKg: Number(cyl.sizeKg),
        fullStock: cyl.fullStock,
        reorderLevel: cyl.reorderLevel,
        isCritical: cyl.fullStock === 0,
      });
    }
  }

  async getSales(query: GasCylinderQueryDto, userRole: string, userStationId: string | null) {
    const where: any = {};

    if (userRole === 'STATION_MANAGER' && userStationId) {
      where.stationId = userStationId;
    } else if (userRole === 'WORKER' && userStationId) {
      where.stationId = userStationId;
    } else if (query.stationId) {
      where.stationId = query.stationId;
    }

    if (query.from || query.to) {
      where.saleDate = {};
      if (query.from) where.saleDate.gte = new Date(query.from);
      if (query.to) where.saleDate.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.cylinderSale.findMany({
        where,
        include: {
          gasCylinder: { select: { id: true, brand: true, sizeKg: true } },
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { saleDate: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.cylinderSale.count({ where }),
    ]);

    return { items, total };
  }

  // ─── Stock Ins ────────────────────────────────────────────────────────────

  async createStockIn(dto: CreateCylinderStockInDto, userId: string) {
    const cylinder = await this.prisma.gasCylinder.findUnique({ where: { id: dto.gasCylinderId } });
    if (!cylinder) throw new NotFoundException('Gas cylinder not found');

    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
    const totalCost = dto.purchasePriceLkr * dto.quantity;
    const fiscal = this.getFiscalPeriod(receivedAt);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.gasCylinder.update({
        where: { id: dto.gasCylinderId },
        data: { fullStock: { increment: dto.quantity } },
      });

      const transaction = await tx.transaction.create({
        data: {
          stationId: dto.stationId,
          category: TransactionCategory.GAS_CYLINDER_PURCHASE,
          description: `Gas cylinder stock-in — ${cylinder.brand} ${cylinder.sizeKg}kg x${dto.quantity}`,
          amountLkr: totalCost,
          vatAmountLkr: 0,
          netAmountLkr: totalCost,
          paymentMethod: 'BANK_TRANSFER',
          transactionDate: receivedAt,
          fiscalYear: fiscal.year,
          fiscalMonth: fiscal.month,
          createdById: userId,
        },
      });

      return tx.cylinderStockIn.create({
        data: {
          stationId: dto.stationId,
          gasCylinderId: dto.gasCylinderId,
          quantity: dto.quantity,
          purchasePriceLkr: dto.purchasePriceLkr,
          totalCostLkr: totalCost,
          receivedAt,
          notes: dto.notes,
          createdById: userId,
          transactionId: transaction.id,
        },
        include: {
          gasCylinder: { select: { id: true, brand: true, sizeKg: true, fullStock: true } },
          station: { select: { id: true, name: true } },
        },
      });
    });

    return result;
  }

  async getStockIns(query: GasCylinderQueryDto, userStationId?: string | null) {
    const where: any = {};
    const stationId = userStationId ?? query.stationId;
    if (stationId) where.stationId = stationId;

    if (query.from || query.to) {
      where.receivedAt = {};
      if (query.from) where.receivedAt.gte = new Date(query.from);
      if (query.to) where.receivedAt.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.cylinderStockIn.findMany({
        where,
        include: {
          gasCylinder: { select: { id: true, brand: true, sizeKg: true } },
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { receivedAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.cylinderStockIn.count({ where }),
    ]);

    return { items, total };
  }
}
