import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { CreateSparePartSaleDto } from './dto/create-spare-part-sale.dto';
import { CreateSparePartStockInDto } from './dto/create-spare-part-stock-in.dto';
import { SparePartQueryDto } from './dto/spare-part-query.dto';
import { TransactionCategory } from '@gasstation/shared-types';

@Injectable()
export class SparePartsService {
  private readonly logger = new Logger(SparePartsService.name);

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

  async createPart(dto: CreateSparePartDto) {
    const station = await this.prisma.station.findUnique({ where: { id: dto.stationId } });
    if (!station) throw new NotFoundException('Station not found');

    const existing = await this.prisma.sparePart.findUnique({
      where: { stationId_sku: { stationId: dto.stationId, sku: dto.sku } },
    });
    if (existing) throw new BadRequestException(`SKU '${dto.sku}' already exists for this station`);

    return this.prisma.sparePart.create({ data: { ...dto } });
  }

  async getParts(query: SparePartQueryDto, userStationId?: string | null) {
    const where: any = { isActive: true };
    const stationId = userStationId ?? query.stationId;
    if (stationId) where.stationId = stationId;

    if (query.lowStockOnly) {
      // currentStock <= reorderLevel
      where.AND = [{ currentStock: { lte: this.prisma.sparePart.fields?.reorderLevel ?? 0 } }];
    }

    const parts = await this.prisma.sparePart.findMany({
      where,
      include: { station: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    });

    // Filter low stock in-memory (prisma can't compare two fields directly without raw)
    const filtered = query.lowStockOnly
      ? parts.filter((p) => p.currentStock <= p.reorderLevel)
      : parts;

    return filtered;
  }

  async getLowStock(stationId?: string) {
    const parts = await this.prisma.sparePart.findMany({
      where: stationId ? { stationId, isActive: true } : { isActive: true },
      include: { station: { select: { id: true, name: true } } },
    });
    return parts.filter((p) => p.currentStock <= p.reorderLevel);
  }

  async updatePart(id: string, dto: UpdateSparePartDto) {
    const part = await this.prisma.sparePart.findUnique({ where: { id } });
    if (!part) throw new NotFoundException('Spare part not found');
    return this.prisma.sparePart.update({ where: { id }, data: dto });
  }

  // ─── Sales ────────────────────────────────────────────────────────────────

  async createSale(dto: CreateSparePartSaleDto, userId: string) {
    const station = await this.prisma.station.findUnique({ where: { id: dto.stationId } });
    if (!station) throw new NotFoundException('Station not found');

    // Pre-validate all parts exist and have sufficient stock
    for (const item of dto.items) {
      const part = await this.prisma.sparePart.findUnique({ where: { id: item.sparePartId } });
      if (!part) throw new NotFoundException(`Spare part ${item.sparePartId} not found`);
      if (part.currentStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for '${part.name}': available ${part.currentStock}, requested ${item.quantity}`,
        );
      }
    }

    const totalAmount = dto.items.reduce((s, i) => s + i.unitPriceLkr * i.quantity, 0);
    const saleDate = new Date(dto.saleDate);
    const fiscal = this.getFiscalPeriod(saleDate);

    const soldPartIds = dto.items.map((i) => i.sparePartId);

    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        await tx.sparePart.update({
          where: { id: item.sparePartId },
          data: { currentStock: { decrement: item.quantity } },
        });
      }

      // Create Transaction record
      const transaction = await tx.transaction.create({
        data: {
          stationId: dto.stationId,
          category: TransactionCategory.SPARE_PARTS_SALE,
          description: `Spare parts sale — ${dto.items.length} item(s)`,
          amountLkr: totalAmount,
          vatAmountLkr: 0,
          netAmountLkr: totalAmount,
          paymentMethod: dto.paymentMethod,
          transactionDate: saleDate,
          fiscalYear: fiscal.year,
          fiscalMonth: fiscal.month,
          createdById: userId,
        },
      });

      // Create SparePartSale with items
      const sale = await tx.sparePartSale.create({
        data: {
          stationId: dto.stationId,
          totalAmountLkr: totalAmount,
          paymentMethod: dto.paymentMethod,
          saleDate,
          notes: dto.notes,
          createdById: userId,
          transactionId: transaction.id,
          items: {
            create: dto.items.map((item) => ({
              sparePartId: item.sparePartId,
              quantity: item.quantity,
              unitPriceLkr: item.unitPriceLkr,
              totalLkr: item.unitPriceLkr * item.quantity,
            })),
          },
        },
        include: {
          items: { include: { sparePart: { select: { id: true, name: true, sku: true } } } },
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      return sale;
    });

    // Check each sold part for reorder level breach (after transaction commits)
    await this.emitLowStockForParts(soldPartIds);

    return result;
  }

  private async emitLowStockForParts(partIds: string[]) {
    const parts = await this.prisma.sparePart.findMany({
      where: { id: { in: partIds }, isActive: true },
      include: { station: { select: { id: true, name: true } } },
    });
    for (const part of parts) {
      if (part.currentStock <= part.reorderLevel) {
        this.events.emit('spareParts.low', {
          partId: part.id,
          stationId: part.stationId,
          stationName: (part as any).station?.name,
          sku: part.sku,
          name: part.name,
          currentStock: part.currentStock,
          reorderLevel: part.reorderLevel,
          isCritical: part.currentStock === 0,
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkReorderLevels() {
    const lowParts = await this.getLowStock();
    if (!lowParts.length) return;
    this.logger.warn(`[Cron] ${lowParts.length} spare part(s) below reorder level`);
    for (const part of lowParts) {
      this.events.emit('spareParts.low', {
        partId: part.id,
        stationId: part.stationId,
        stationName: (part as any).station?.name,
        sku: (part as any).sku,
        name: part.name,
        currentStock: part.currentStock,
        reorderLevel: part.reorderLevel,
        isCritical: part.currentStock === 0,
      });
    }
  }

  async getSales(query: SparePartQueryDto, userRole: string, userStationId: string | null) {
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
      this.prisma.sparePartSale.findMany({
        where,
        include: {
          items: { include: { sparePart: { select: { id: true, name: true, sku: true } } } },
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { saleDate: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.sparePartSale.count({ where }),
    ]);

    return { items, total };
  }

  // ─── Stock Ins ────────────────────────────────────────────────────────────

  async createStockIn(dto: CreateSparePartStockInDto, userId: string) {
    const part = await this.prisma.sparePart.findUnique({ where: { id: dto.sparePartId } });
    if (!part) throw new NotFoundException('Spare part not found');

    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
    const totalCost = dto.costPriceLkr * dto.quantity;
    const fiscal = this.getFiscalPeriod(receivedAt);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.sparePart.update({
        where: { id: dto.sparePartId },
        data: { currentStock: { increment: dto.quantity } },
      });

      const transaction = await tx.transaction.create({
        data: {
          stationId: dto.stationId,
          category: TransactionCategory.SPARE_PARTS_PURCHASE,
          description: `Spare parts stock-in — ${part.name} x${dto.quantity}`,
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

      return tx.sparePartStockIn.create({
        data: {
          stationId: dto.stationId,
          sparePartId: dto.sparePartId,
          quantity: dto.quantity,
          costPriceLkr: dto.costPriceLkr,
          totalCostLkr: totalCost,
          receivedAt,
          notes: dto.notes,
          createdById: userId,
          transactionId: transaction.id,
        },
        include: {
          sparePart: { select: { id: true, name: true, sku: true, currentStock: true } },
          station: { select: { id: true, name: true } },
        },
      });
    });

    return result;
  }

  async getStockIns(query: SparePartQueryDto, userStationId?: string | null) {
    const where: any = {};
    const stationId = userStationId ?? query.stationId;
    if (stationId) where.stationId = stationId;

    if (query.from || query.to) {
      where.receivedAt = {};
      if (query.from) where.receivedAt.gte = new Date(query.from);
      if (query.to) where.receivedAt.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.sparePartStockIn.findMany({
        where,
        include: {
          sparePart: { select: { id: true, name: true, sku: true } },
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { receivedAt: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.sparePartStockIn.count({ where }),
    ]);

    return { items, total };
  }
}
