import { apiClient } from './client';

// ─── Income Statement Types ───────────────────────────────────────────────────

export interface FuelTypeRevenue {
  fuelType: string;
  grossRevenue: number;
  netRevenue: number;
  litres: number;
}

export interface IncomeStatement {
  period: { from: string; to: string };
  revenue: {
    grossRevenue: number;
    outputVAT: number;
    netRevenue: number;
    cashSales: number;
    creditSales: number;
    byFuelType: FuelTypeRevenue[];
    vehicleServiceRevenue: number;
    carWashRevenue: number;
    sparePartsRevenue: number;
    gasCylinderRevenue: number;
    totalGrossRevenue: number;
  };
  cogs: {
    totalPurchases: number;
    sparePartsCogs: number;
    gasCylinderCogs: number;
    totalCogs: number;
  };
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: {
    salaries: number;
    opex: number;
    otherExpenses: number;
    total: number;
  };
  otherIncome: number;
  ebit: number;
  incomeTaxEstimate: number;
  netProfit: number;
  netMarginPct: number;
}

// ─── Cash Flow Types ──────────────────────────────────────────────────────────

export interface CashFlowStatement {
  period: { from: string; to: string };
  cashReceipts: {
    cashSales: number;
    vehicleServiceCash: number;
    carWashCash: number;
    sparePartsCash: number;
    gasCylinderCash: number;
    total: number;
  };
  cashPayments: {
    fuelPurchases: number;
    salaries: number;
    operatingExpenses: number;
    taxPayments: number;
    sparePartsPurchases: number;
    gasCylinderPurchases: number;
    total: number;
  };
  netOperatingCashFlow: number;
}

// ─── Stock Valuation Types ────────────────────────────────────────────────────

export interface TankValuation {
  tankId: string;
  stationId: string;
  stationName: string;
  fuelType: string;
  quantityLitres: number;
  unitCostLkr: number;
  totalValueLkr: number;
}

export interface StockValuation {
  asOf: string;
  valuations: TankValuation[];
  totalInventoryValueLkr: number;
  note: string;
}

// ─── Monthly Trend Types ──────────────────────────────────────────────────────

export interface MonthlyTrendEntry {
  fiscalMonth: number;
  calMonth: number;
  calYear: number;
  label: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  netProfit: number;
}

export interface MonthlyTrend {
  fiscalYear: number;
  months: MonthlyTrendEntry[];
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const reportsApi = {
  getIncomeStatement: async (params: {
    stationId?: string;
    from: string;
    to: string;
  }): Promise<IncomeStatement> => {
    const { data } = await apiClient.get('/reports/income-statement', { params });
    return data;
  },

  getCashFlow: async (params: {
    stationId?: string;
    from: string;
    to: string;
  }): Promise<CashFlowStatement> => {
    const { data } = await apiClient.get('/reports/cash-flow', { params });
    return data;
  },

  getStockValuation: async (params: {
    stationId?: string;
    date: string;
  }): Promise<StockValuation> => {
    const { data } = await apiClient.get('/reports/stock-valuation', { params });
    return data;
  },

  getMonthlyTrend: async (params: {
    stationId?: string;
    fiscalYear: number;
  }): Promise<MonthlyTrend> => {
    const { data } = await apiClient.get('/reports/monthly-trend', { params });
    return data;
  },
};
