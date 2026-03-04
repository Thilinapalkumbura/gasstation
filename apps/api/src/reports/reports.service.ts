import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helper ───────────────────────────────────────────────────────────────

  private toNum(d: Decimal | null | undefined): number {
    if (!d) return 0;
    return parseFloat(d.toString());
  }

  private pct(num: number, den: number): number {
    if (den === 0) return 0;
    return parseFloat(((num / den) * 100).toFixed(2));
  }

  // ─── LKAS 1 — Income Statement ────────────────────────────────────────────

  async getIncomeStatement(stationId: string | undefined, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const tankFilter = stationId ? { tank: { stationId } } : {};
    const stationFilter = stationId ? { stationId } : {};
    const poStationFilter = stationId ? { purchaseOrder: { stationId } } : {};

    const [usageLogs, grns, transactions] = await Promise.all([
      this.prisma.dailyUsageLog.findMany({
        where: {
          ...tankFilter,
          status: 'APPROVED',
          date: { gte: start, lte: end },
        },
        include: { tank: { select: { fuelType: true, stationId: true, station: { select: { name: true } } } } },
      }),
      this.prisma.goodsReceivedNote.findMany({
        where: {
          receivedAt: { gte: start, lte: end },
          ...poStationFilter,
        },
        include: { items: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          ...stationFilter,
          transactionDate: { gte: start, lte: end },
        },
      }),
    ]);

    // Revenue
    const grossRevenue = usageLogs.reduce((s, l) => s + this.toNum(l.totalSalesLkr), 0);
    const outputVAT = grossRevenue * (18 / 118);
    const netRevenue = grossRevenue - outputVAT;
    const cashSales = usageLogs.reduce((s, l) => s + this.toNum(l.cashSalesLkr), 0);
    const creditSales = usageLogs.reduce((s, l) => s + this.toNum(l.creditSalesLkr), 0);

    // New business revenues from transactions
    const vehicleServiceRevenue = transactions
      .filter((t) => t.category === 'VEHICLE_SERVICE_SALE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const carWashRevenue = transactions
      .filter((t) => t.category === 'CAR_WASH_SALE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const sparePartsRevenue = transactions
      .filter((t) => t.category === 'SPARE_PARTS_SALE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const gasCylinderRevenue = transactions
      .filter((t) => t.category === 'GAS_CYLINDER_SALE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const totalGrossRevenue = grossRevenue + vehicleServiceRevenue + carWashRevenue + sparePartsRevenue + gasCylinderRevenue;

    // By fuel type
    const byFuelType: Record<string, { grossRevenue: number; netRevenue: number; litres: number }> = {};
    for (const log of usageLogs) {
      const ft = log.tank.fuelType;
      if (!byFuelType[ft]) byFuelType[ft] = { grossRevenue: 0, netRevenue: 0, litres: 0 };
      const gross = this.toNum(log.totalSalesLkr);
      byFuelType[ft].grossRevenue += gross;
      byFuelType[ft].netRevenue += gross * (100 / 118);
      byFuelType[ft].litres += this.toNum(log.dispensedLitres);
    }

    // COGS — GRN purchase amounts (ex-VAT equivalent)
    const totalPurchasesGross = grns.reduce((s, grn) => {
      return s + grn.items.reduce((gs, item) => gs + this.toNum(item.totalAmountLkr), 0);
    }, 0);
    const totalPurchases = totalPurchasesGross;

    // New COGS from transactions
    const sparePartsCogs = transactions
      .filter((t) => t.category === 'SPARE_PARTS_PURCHASE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const gasCylinderCogs = transactions
      .filter((t) => t.category === 'GAS_CYLINDER_PURCHASE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const totalCogs = totalPurchases + sparePartsCogs + gasCylinderCogs;

    const grossProfit = (netRevenue + vehicleServiceRevenue + carWashRevenue + sparePartsRevenue + gasCylinderRevenue) - totalCogs;

    // Operating Expenses
    const salaries = transactions
      .filter((t) => t.category === 'SALARY')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const opex = transactions
      .filter((t) => t.category === 'OPERATING_EXPENSE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const otherExpenses = transactions
      .filter((t) => t.category === 'OTHER_EXPENSE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const totalOpex = salaries + opex + otherExpenses;

    const otherIncome = transactions
      .filter((t) => t.category === 'OTHER_INCOME')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const ebit = grossProfit - totalOpex + otherIncome;
    const pbt = ebit;
    const incomeTaxEstimate = Math.max(pbt * 0.30, 0);
    const netProfit = pbt - incomeTaxEstimate;

    return {
      period: { from, to },
      revenue: {
        grossRevenue: +grossRevenue.toFixed(2),
        outputVAT: +outputVAT.toFixed(2),
        netRevenue: +netRevenue.toFixed(2),
        cashSales: +cashSales.toFixed(2),
        creditSales: +creditSales.toFixed(2),
        vehicleServiceRevenue: +vehicleServiceRevenue.toFixed(2),
        carWashRevenue: +carWashRevenue.toFixed(2),
        sparePartsRevenue: +sparePartsRevenue.toFixed(2),
        gasCylinderRevenue: +gasCylinderRevenue.toFixed(2),
        totalGrossRevenue: +totalGrossRevenue.toFixed(2),
        byFuelType: Object.entries(byFuelType).map(([fuelType, vals]) => ({
          fuelType,
          ...vals,
          grossRevenue: +vals.grossRevenue.toFixed(2),
          netRevenue: +vals.netRevenue.toFixed(2),
          litres: +vals.litres.toFixed(2),
        })),
      },
      cogs: {
        totalPurchases: +totalPurchases.toFixed(2),
        sparePartsCogs: +sparePartsCogs.toFixed(2),
        gasCylinderCogs: +gasCylinderCogs.toFixed(2),
        totalCogs: +totalCogs.toFixed(2),
      },
      grossProfit: +grossProfit.toFixed(2),
      grossMarginPct: this.pct(grossProfit, netRevenue),
      operatingExpenses: {
        salaries: +salaries.toFixed(2),
        opex: +opex.toFixed(2),
        otherExpenses: +otherExpenses.toFixed(2),
        total: +totalOpex.toFixed(2),
      },
      otherIncome: +otherIncome.toFixed(2),
      ebit: +ebit.toFixed(2),
      incomeTaxEstimate: +incomeTaxEstimate.toFixed(2),
      netProfit: +netProfit.toFixed(2),
      netMarginPct: this.pct(netProfit, netRevenue),
    };
  }

  // ─── LKAS 7 — Cash Flow Statement (Direct Method) ─────────────────────────

  async getCashFlowStatement(stationId: string | undefined, from: string, to: string) {
    const start = new Date(from);
    const end = new Date(to);

    const tankFilter = stationId ? { tank: { stationId } } : {};
    const stationFilter = stationId ? { stationId } : {};
    const poStationFilter = stationId ? { purchaseOrder: { stationId } } : {};

    const [usageLogs, grns, transactions] = await Promise.all([
      this.prisma.dailyUsageLog.findMany({
        where: {
          ...tankFilter,
          status: 'APPROVED',
          date: { gte: start, lte: end },
        },
      }),
      this.prisma.goodsReceivedNote.findMany({
        where: {
          receivedAt: { gte: start, lte: end },
          ...poStationFilter,
        },
        include: { items: true, purchaseOrder: { select: { stationId: true } } },
      }),
      this.prisma.transaction.findMany({
        where: {
          ...stationFilter,
          transactionDate: { gte: start, lte: end },
        },
      }),
    ]);

    // Cash Receipts
    const cashFromSales = usageLogs.reduce((s, l) => s + this.toNum(l.cashSalesLkr), 0);

    // New cash receipts from service/product sale categories (cash payment method only)
    const vehicleServiceCash = transactions
      .filter((t) => t.category === 'VEHICLE_SERVICE_SALE' && t.paymentMethod === 'CASH')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const carWashCash = transactions
      .filter((t) => t.category === 'CAR_WASH_SALE' && t.paymentMethod === 'CASH')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const sparePartsCash = transactions
      .filter((t) => t.category === 'SPARE_PARTS_SALE' && t.paymentMethod === 'CASH')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const gasCylinderCash = transactions
      .filter((t) => t.category === 'GAS_CYLINDER_SALE' && t.paymentMethod === 'CASH')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const totalCashReceipts = cashFromSales + vehicleServiceCash + carWashCash + sparePartsCash + gasCylinderCash;

    // Cash Payments
    const cashGrnPayments = grns.reduce((s, grn) => {
      return s + grn.items.reduce((gs, item) => gs + this.toNum(item.totalAmountLkr), 0);
    }, 0);

    const salaryPayments = transactions
      .filter((t) => t.category === 'SALARY' && t.paymentMethod === 'BANK_TRANSFER')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const opexCash = transactions
      .filter((t) => t.category === 'OPERATING_EXPENSE' &&
        (t.paymentMethod === 'CASH' || t.paymentMethod === 'BANK_TRANSFER'))
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const taxPayments = transactions
      .filter((t) => t.category === 'TAX_PAYMENT')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    // New cash payments from purchase categories (all counted as cash payments)
    const sparePartsPurchasesCash = transactions
      .filter((t) => t.category === 'SPARE_PARTS_PURCHASE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
    const gasCylinderPurchasesCash = transactions
      .filter((t) => t.category === 'GAS_CYLINDER_PURCHASE')
      .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

    const totalCashPayments = cashGrnPayments + salaryPayments + opexCash + taxPayments + sparePartsPurchasesCash + gasCylinderPurchasesCash;
    const netOperatingCashFlow = totalCashReceipts - totalCashPayments;

    return {
      period: { from, to },
      cashReceipts: {
        cashSales: +cashFromSales.toFixed(2),
        vehicleServiceCash: +vehicleServiceCash.toFixed(2),
        carWashCash: +carWashCash.toFixed(2),
        sparePartsCash: +sparePartsCash.toFixed(2),
        gasCylinderCash: +gasCylinderCash.toFixed(2),
        total: +totalCashReceipts.toFixed(2),
      },
      cashPayments: {
        fuelPurchases: +cashGrnPayments.toFixed(2),
        salaries: +salaryPayments.toFixed(2),
        operatingExpenses: +opexCash.toFixed(2),
        taxPayments: +taxPayments.toFixed(2),
        sparePartsPurchases: +sparePartsPurchasesCash.toFixed(2),
        gasCylinderPurchases: +gasCylinderPurchasesCash.toFixed(2),
        total: +totalCashPayments.toFixed(2),
      },
      netOperatingCashFlow: +netOperatingCashFlow.toFixed(2),
    };
  }

  // ─── LKAS 2 — Stock Valuation ─────────────────────────────────────────────

  async getStockValuation(stationId: string | undefined, date: string) {
    const asOf = new Date(date);

    const tanks = await this.prisma.tank.findMany({
      where: stationId ? { stationId } : {},
      include: { station: { select: { name: true } } },
    });

    const valuations = await Promise.all(
      tanks.map(async (tank) => {
        // Last DELIVERY_IN movement for unit cost (weighted avg from latest delivery)
        const lastDelivery = await this.prisma.stockMovement.findFirst({
          where: {
            tankId: tank.id,
            type: 'DELIVERY_IN',
            createdAt: { lte: asOf },
            unitCostLkr: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        const unitCostLkr = lastDelivery ? this.toNum(lastDelivery.unitCostLkr) : 0;
        const quantityLitres = this.toNum(tank.currentLevelLitres);
        const totalValueLkr = quantityLitres * unitCostLkr;

        return {
          tankId: tank.id,
          stationId: tank.stationId,
          stationName: tank.station.name,
          fuelType: tank.fuelType,
          quantityLitres: +quantityLitres.toFixed(2),
          unitCostLkr: +unitCostLkr.toFixed(4),
          totalValueLkr: +totalValueLkr.toFixed(2),
        };
      }),
    );

    const totalInventoryValueLkr = valuations.reduce(
      (s, v) => s + v.totalValueLkr,
      0,
    );

    return {
      asOf: date,
      valuations,
      totalInventoryValueLkr: +totalInventoryValueLkr.toFixed(2),
      note: 'Valued using weighted average cost method per LKAS 2',
    };
  }

  // ─── Monthly Trend (12-month fiscal year) ────────────────────────────────

  async getMonthlyTrend(stationId: string | undefined, fiscalYear: number) {
    // SL fiscal year: April (month 4) of fiscalYear → March (month 3) of fiscalYear+1
    const months = Array.from({ length: 12 }, (_, i) => {
      const calMonth = ((3 + i) % 12) + 1; // 4,5,...,12,1,2,3
      const calYear = calMonth >= 4 ? fiscalYear : fiscalYear + 1;
      return { fiscalMonth: i + 1, calMonth, calYear };
    });

    const tankFilter = stationId ? { tank: { stationId } } : {};
    const stationFilter = stationId ? { stationId } : {};
    const poStationFilter = stationId ? { purchaseOrder: { stationId } } : {};

    const results = await Promise.all(
      months.map(async ({ fiscalMonth, calMonth, calYear }) => {
        const start = new Date(calYear, calMonth - 1, 1);
        const end = new Date(calYear, calMonth, 0);

        const [usageLogs, grns, transactions] = await Promise.all([
          this.prisma.dailyUsageLog.findMany({
            where: { ...tankFilter, status: 'APPROVED', date: { gte: start, lte: end } },
          }),
          this.prisma.goodsReceivedNote.findMany({
            where: { receivedAt: { gte: start, lte: end }, ...poStationFilter },
            include: { items: true },
          }),
          this.prisma.transaction.findMany({
            where: { ...stationFilter, transactionDate: { gte: start, lte: end } },
          }),
        ]);

        const grossRevenue = usageLogs.reduce((s, l) => s + this.toNum(l.totalSalesLkr), 0);

        // New business revenue from transaction categories
        const newBusinessRevenue = transactions
          .filter((t) =>
            t.category === 'VEHICLE_SERVICE_SALE' ||
            t.category === 'CAR_WASH_SALE' ||
            t.category === 'SPARE_PARTS_SALE' ||
            t.category === 'GAS_CYLINDER_SALE',
          )
          .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

        const netRevenue = grossRevenue * (100 / 118) + newBusinessRevenue;

        const grnCogs = grns.reduce((s, grn) => {
          return s + grn.items.reduce((gs, item) => gs + this.toNum(item.totalAmountLkr), 0);
        }, 0);

        // New COGS from transaction purchase categories
        const newCogs = transactions
          .filter((t) =>
            t.category === 'SPARE_PARTS_PURCHASE' ||
            t.category === 'GAS_CYLINDER_PURCHASE',
          )
          .reduce((s, t) => s + this.toNum(t.amountLkr), 0);

        const cogs = grnCogs + newCogs;

        const opex = transactions
          .filter((t) => ['OPERATING_EXPENSE', 'SALARY'].includes(t.category))
          .reduce((s, t) => s + this.toNum(t.amountLkr), 0);
        const grossProfit = netRevenue - cogs;
        const netProfit = grossProfit - opex;

        return {
          fiscalMonth,
          calMonth,
          calYear,
          label: new Date(calYear, calMonth - 1, 1).toLocaleString('en-LK', { month: 'short', year: '2-digit' }),
          revenue: +netRevenue.toFixed(2),
          cogs: +cogs.toFixed(2),
          grossProfit: +grossProfit.toFixed(2),
          netProfit: +netProfit.toFixed(2),
        };
      }),
    );

    return { fiscalYear, months: results };
  }
}
