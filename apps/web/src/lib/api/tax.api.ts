import { apiClient } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaxType = 'VAT' | 'INCOME_TAX' | 'WHT' | 'ESC' | 'PAYE';
export type TaxPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export interface TaxEntry {
  id: string;
  stationId: string;
  taxType: TaxType;
  period: TaxPeriod;
  periodStart: string;
  periodEnd: string;
  grossAmountLkr: number;
  taxableAmountLkr: number;
  taxRatePercent: number;
  taxAmountLkr: number;
  inputTaxLkr: number;
  netTaxPayableLkr: number;
  isPaid: boolean;
  paidAt: string | null;
  filingReference: string | null;
  notes: string | null;
  createdAt: string;
  station?: { id: string; name: string };
}

export interface TaxSummaryEntry {
  total: number;
  paid: number;
  unpaid: number;
}

export interface TaxSummary {
  stationId: string;
  year: number;
  summary: Record<TaxType, TaxSummaryEntry>;
}

export interface VATReturn {
  period: { month: number; year: number; start: string; end: string };
  stationId: string;
  partA: {
    box1_grossSalesIncVat: number;
    box2_outputVat: number;
    box3_zeroRatedSupplies: number;
    box4_standardRatedSalesExVat: number;
  };
  partB: {
    box5_totalPurchasesIncVat: number;
    box6_inputVat: number;
  };
  partC: {
    box7_netVatPayable: number;
    isRefund: boolean;
  };
}

export interface ComputeTaxPayload {
  stationId: string;
  taxType: TaxType;
  month: number;
  year: number;
}

export interface TaxEntriesResult {
  items: TaxEntry[];
  total: number;
}

export interface TaxEntryQuery {
  stationId?: string;
  taxType?: TaxType;
  isPaid?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const taxApi = {
  computeTax: async (payload: ComputeTaxPayload): Promise<TaxEntry> => {
    const { data } = await apiClient.post('/tax/compute', payload);
    return data;
  },

  getEntries: async (query?: TaxEntryQuery): Promise<TaxEntriesResult> => {
    const { data } = await apiClient.get('/tax/entries', { params: query });
    return data;
  },

  getSummary: async (stationId: string, year: number): Promise<TaxSummary> => {
    const { data } = await apiClient.get('/tax/summary', {
      params: { stationId, year },
    });
    return data;
  },

  getVATReturn: async (stationId: string, month: number, year: number): Promise<VATReturn> => {
    const { data } = await apiClient.get('/tax/vat-return', {
      params: { stationId, month, year },
    });
    return data;
  },

  markPaid: async (id: string, filingReference: string): Promise<TaxEntry> => {
    const { data } = await apiClient.patch(`/tax/entries/${id}/mark-paid`, {
      filingReference,
    });
    return data;
  },
};
