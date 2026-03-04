import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { TaxQueryDto } from './dto/tax-query.dto';

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Returns start/end Date objects for a calendar month */
  private monthRange(month: number, year: number): { start: Date; end: Date } {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of month
    return { start, end };
  }

  /** Returns fiscal year start (April 1) and end (March 31) */
  private fiscalYearRange(fiscalYear: number): { start: Date; end: Date } {
    return {
      start: new Date(fiscalYear, 3, 1),      // April 1
      end: new Date(fiscalYear + 1, 2, 31),   // March 31 next year
    };
  }

  private toNum(d: Decimal | null | undefined): number {
    if (!d) return 0;
    return parseFloat(d.toString());
  }

  // ─── VAT Computation ──────────────────────────────────────────────────────

  async computeVAT(stationId: string, month: number, year: number) {
    const { start, end } = this.monthRange(month, year);

    const [usageLogs, grns, newSaleTxns, newPurchaseTxns] = await Promise.all([
      // Approved daily usage logs → Output VAT base (fuel sales)
      this.prisma.dailyUsageLog.findMany({
        where: {
          tank: { stationId },
          status: 'APPROVED',
          date: { gte: start, lte: end },
        },
      }),
      // GRNs from VAT-registered suppliers → Input VAT base (fuel purchases)
      this.prisma.goodsReceivedNote.findMany({
        where: {
          receivedAt: { gte: start, lte: end },
          purchaseOrder: {
            stationId,
            supplier: { vatRegNo: { not: null } },
          },
        },
        include: { items: true },
      }),
      // New business sale transactions → additional output VAT base
      this.prisma.transaction.findMany({
        where: {
          stationId,
          category: { in: ['VEHICLE_SERVICE_SALE', 'CAR_WASH_SALE', 'SPARE_PARTS_SALE', 'GAS_CYLINDER_SALE'] as any },
          transactionDate: { gte: start, lte: end },
        },
      }),
      // New business purchase transactions → additional input VAT base
      this.prisma.transaction.findMany({
        where: {
          stationId,
          category: { in: ['SPARE_PARTS_PURCHASE', 'GAS_CYLINDER_PURCHASE'] as any },
          transactionDate: { gte: start, lte: end },
        },
      }),
    ]);

    // Output VAT: fuel sales
    const fuelSales = usageLogs.reduce((sum, log) => sum + this.toNum(log.totalSalesLkr), 0);
    // Output VAT: new business sales (treated as VAT-inclusive)
    const newBusinessSales = newSaleTxns.reduce((sum, t) => sum + this.toNum(t.amountLkr), 0);
    const totalOutputBase = fuelSales + newBusinessSales;
    const outputVat = totalOutputBase * (18 / 118);

    // Input VAT: fuel GRNs
    const totalFuelPurchasesVatInc = grns.reduce((sum, grn) => {
      return sum + grn.items.reduce((s, item) => s + this.toNum(item.totalAmountLkr), 0);
    }, 0);
    // Input VAT: spare parts + gas cylinder purchases
    const newPurchasesVatInc = newPurchaseTxns.reduce((sum, t) => sum + this.toNum(t.amountLkr), 0);
    const totalInputBase = totalFuelPurchasesVatInc + newPurchasesVatInc;
    const inputVat = totalInputBase * (18 / 118);

    const netVat = outputVat - inputVat;

    // Upsert TaxEntry for this period
    const existing = await this.prisma.taxEntry.findFirst({
      where: {
        stationId,
        taxType: 'VAT',
        periodStart: start,
        periodEnd: end,
      },
    });

    const data = {
      stationId,
      taxType: 'VAT' as const,
      period: 'MONTHLY' as const,
      periodStart: start,
      periodEnd: end,
      grossAmountLkr: new Decimal(totalOutputBase.toFixed(2)),
      taxableAmountLkr: new Decimal((totalOutputBase * (100 / 118)).toFixed(2)),
      taxRatePercent: new Decimal('18.0000'),
      taxAmountLkr: new Decimal(outputVat.toFixed(2)),
      inputTaxLkr: new Decimal(inputVat.toFixed(2)),
      netTaxPayableLkr: new Decimal(netVat.toFixed(2)),
    };

    if (existing) {
      return this.prisma.taxEntry.update({ where: { id: existing.id }, data });
    }
    return this.prisma.taxEntry.create({ data });
  }

  // ─── WHT Computation ─────────────────────────────────────────────────────

  async computeWHT(stationId: string, month: number, year: number) {
    const { start, end } = this.monthRange(month, year);

    // WHT 5% on OPERATING_EXPENSE payments to companies
    const transactions = await this.prisma.transaction.findMany({
      where: {
        stationId,
        category: 'OPERATING_EXPENSE',
        transactionDate: { gte: start, lte: end },
      },
    });

    const totalOpex = transactions.reduce(
      (sum, t) => sum + this.toNum(t.amountLkr),
      0,
    );
    const whtAmount = totalOpex * 0.05;

    const existing = await this.prisma.taxEntry.findFirst({
      where: {
        stationId,
        taxType: 'WHT',
        periodStart: start,
        periodEnd: end,
      },
    });

    const data = {
      stationId,
      taxType: 'WHT' as const,
      period: 'MONTHLY' as const,
      periodStart: start,
      periodEnd: end,
      grossAmountLkr: new Decimal(totalOpex.toFixed(2)),
      taxableAmountLkr: new Decimal(totalOpex.toFixed(2)),
      taxRatePercent: new Decimal('5.0000'),
      taxAmountLkr: new Decimal(whtAmount.toFixed(2)),
      inputTaxLkr: new Decimal('0'),
      netTaxPayableLkr: new Decimal(whtAmount.toFixed(2)),
    };

    if (existing) {
      return this.prisma.taxEntry.update({ where: { id: existing.id }, data });
    }
    return this.prisma.taxEntry.create({ data });
  }

  // ─── Income Tax Estimate ──────────────────────────────────────────────────

  async getIncomeTaxEstimate(stationId: string, fiscalYear: number) {
    const { start, end } = this.fiscalYearRange(fiscalYear);

    const [usageLogs, grns, transactions] = await Promise.all([
      this.prisma.dailyUsageLog.findMany({
        where: {
          tank: { stationId },
          status: 'APPROVED',
          date: { gte: start, lte: end },
        },
      }),
      this.prisma.goodsReceivedNote.findMany({
        where: {
          receivedAt: { gte: start, lte: end },
          purchaseOrder: { stationId },
        },
        include: { items: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          stationId,
          transactionDate: { gte: start, lte: end },
        },
      }),
    ]);

    const grossRevenue = usageLogs.reduce((s, l) => s + this.toNum(l.totalSalesLkr), 0);
    const netFuelRevenue = grossRevenue * (100 / 118);

    // New business revenues
    const newBusinessRevenue = transactions
      .filter((t) =>
        t.category === 'VEHICLE_SERVICE_SALE' ||
        t.category === 'CAR_WASH_SALE' ||
        t.category === 'SPARE_PARTS_SALE' ||
        t.category === 'GAS_CYLINDER_SALE',
      )
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const netRevenue = netFuelRevenue + newBusinessRevenue;

    const fuelCogs = grns.reduce((s, grn) => {
      return s + grn.items.reduce((gs, item) => gs + this.toNum(item.totalAmountLkr), 0);
    }, 0);

    // New business purchase COGS
    const newPurchaseCogs = transactions
      .filter((t) =>
        t.category === 'SPARE_PARTS_PURCHASE' ||
        t.category === 'GAS_CYLINDER_PURCHASE',
      )
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const cogs = fuelCogs + newPurchaseCogs;

    const opex = transactions
      .filter((t) => t.category === 'OPERATING_EXPENSE' || t.category === 'SALARY')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const otherIncome = transactions
      .filter((t) => t.category === 'OTHER_INCOME')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const grossProfit = netRevenue - cogs;
    const ebit = grossProfit - opex + otherIncome;
    const pbt = ebit;
    const incomeTaxEstimate = Math.max(pbt * 0.30, 0);

    // Upsert annual TaxEntry
    const existing = await this.prisma.taxEntry.findFirst({
      where: {
        stationId,
        taxType: 'INCOME_TAX',
        periodStart: start,
        periodEnd: end,
      },
    });

    const data = {
      stationId,
      taxType: 'INCOME_TAX' as const,
      period: 'ANNUAL' as const,
      periodStart: start,
      periodEnd: end,
      grossAmountLkr: new Decimal(grossRevenue.toFixed(2)),
      taxableAmountLkr: new Decimal(pbt.toFixed(2)),
      taxRatePercent: new Decimal('30.0000'),
      taxAmountLkr: new Decimal(incomeTaxEstimate.toFixed(2)),
      inputTaxLkr: new Decimal('0'),
      netTaxPayableLkr: new Decimal(incomeTaxEstimate.toFixed(2)),
    };

    if (existing) {
      return this.prisma.taxEntry.update({ where: { id: existing.id }, data });
    }
    return this.prisma.taxEntry.create({ data });
  }

  // ─── Query / List ─────────────────────────────────────────────────────────

  async getTaxEntries(query: TaxQueryDto) {
    const where: any = {};
    if (query.stationId) where.stationId = query.stationId;
    if (query.taxType) where.taxType = query.taxType;
    if (query.isPaid !== undefined) where.isPaid = query.isPaid;
    if (query.from || query.to) {
      where.periodStart = {};
      if (query.from) where.periodStart.gte = new Date(query.from);
      if (query.to) where.periodStart.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.taxEntry.findMany({
        where,
        include: { station: { select: { id: true, name: true } } },
        orderBy: { periodStart: 'desc' },
        take: query.limit ?? 20,
        skip: query.offset ?? 0,
      }),
      this.prisma.taxEntry.count({ where }),
    ]);

    return { items, total };
  }

  // ─── Mark Paid ────────────────────────────────────────────────────────────

  async markPaid(id: string, filingReference: string) {
    const entry = await this.prisma.taxEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Tax entry not found');

    return this.prisma.taxEntry.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        filingReference,
      },
    });
  }

  // ─── Year Summary ─────────────────────────────────────────────────────────

  async getTaxSummary(stationId: string, year: number) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    const entries = await this.prisma.taxEntry.findMany({
      where: {
        stationId,
        periodStart: { gte: start, lte: end },
      },
    });

    const summary: Record<string, { total: number; paid: number; unpaid: number }> = {};
    for (const entry of entries) {
      const type = entry.taxType;
      if (!summary[type]) summary[type] = { total: 0, paid: 0, unpaid: 0 };
      const net = this.toNum(entry.netTaxPayableLkr);
      summary[type].total += net;
      if (entry.isPaid) summary[type].paid += net;
      else summary[type].unpaid += net;
    }

    return { stationId, year, summary };
  }

  // ─── IRD VAT-01 Return ────────────────────────────────────────────────────

  async getVATReturn(stationId: string, month: number, year: number) {
    const { start, end } = this.monthRange(month, year);

    const [usageLogs, grns, newSaleTxns, newPurchaseTxns] = await Promise.all([
      this.prisma.dailyUsageLog.findMany({
        where: {
          tank: { stationId },
          status: 'APPROVED',
          date: { gte: start, lte: end },
        },
      }),
      this.prisma.goodsReceivedNote.findMany({
        where: {
          receivedAt: { gte: start, lte: end },
          purchaseOrder: {
            stationId,
            supplier: { vatRegNo: { not: null } },
          },
        },
        include: { items: true },
      }),
      // New business sale transactions → output VAT
      this.prisma.transaction.findMany({
        where: {
          stationId,
          category: { in: ['VEHICLE_SERVICE_SALE', 'CAR_WASH_SALE', 'SPARE_PARTS_SALE', 'GAS_CYLINDER_SALE'] as any },
          transactionDate: { gte: start, lte: end },
        },
      }),
      // New business purchase transactions → input VAT
      this.prisma.transaction.findMany({
        where: {
          stationId,
          category: { in: ['SPARE_PARTS_PURCHASE', 'GAS_CYLINDER_PURCHASE'] as any },
          transactionDate: { gte: start, lte: end },
        },
      }),
    ]);

    const fuelSalesTotal = usageLogs.reduce((s, l) => s + this.toNum(l.totalSalesLkr), 0);
    const newSalesTotal = newSaleTxns.reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const box1GrossSales = fuelSalesTotal + newSalesTotal;
    const box2OutputVat = box1GrossSales * (18 / 118);
    const box3ZeroRated = 0;
    const box4StandardRatedSales = box1GrossSales - box2OutputVat;

    const fuelPurchasesTotal = grns.reduce((s, grn) => {
      return s + grn.items.reduce((gs, item) => gs + this.toNum(item.totalAmountLkr), 0);
    }, 0);
    const newPurchasesTotal = newPurchaseTxns.reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const box5TotalPurchasesVatInc = fuelPurchasesTotal + newPurchasesTotal;
    const box6InputVat = box5TotalPurchasesVatInc * (18 / 118);
    const box7NetVat = box2OutputVat - box6InputVat;

    return {
      period: { month, year, start, end },
      stationId,
      partA: {
        box1_grossSalesIncVat: +box1GrossSales.toFixed(2),
        box2_outputVat: +box2OutputVat.toFixed(2),
        box3_zeroRatedSupplies: box3ZeroRated,
        box4_standardRatedSalesExVat: +box4StandardRatedSales.toFixed(2),
      },
      partB: {
        box5_totalPurchasesIncVat: +box5TotalPurchasesVatInc.toFixed(2),
        box6_inputVat: +box6InputVat.toFixed(2),
      },
      partC: {
        box7_netVatPayable: +box7NetVat.toFixed(2),
        isRefund: box7NetVat < 0,
      },
    };
  }

  // ─── Scheduled: Auto-compute VAT for previous month ──────────────────────

  @Cron('0 0 1 * *')
  async autoComputePreviousMonthVAT() {
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    this.logger.log(`Auto-computing VAT for ${prevMonth}/${prevYear}`);

    const stations = await this.prisma.station.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    await Promise.allSettled(
      stations.map((s) => this.computeVAT(s.id, prevMonth, prevYear)),
    );

    this.logger.log(`Auto-VAT computation complete for ${stations.length} stations`);
  }
}
