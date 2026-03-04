import {
  FuelType,
  OrderStatus,
  PaymentMethod,
  ReportType,
  ShiftType,
  StockMovementType,
  TaxPeriod,
  TaxType,
  TransactionCategory,
  UserRole,
} from './enums';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  role: UserRole;
  stationId: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface IUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  stationId: string | null;
  isActive: boolean;
  createdAt: Date;
}

// ─── Station ─────────────────────────────────────────────────────────────────

export interface IStation {
  id: string;
  name: string;
  address: string;
  city: string;
  contactNumber: string;
  isActive: boolean;
  tanks: ITank[];
}

// ─── Tank / Stock ─────────────────────────────────────────────────────────────

export interface ITank {
  id: string;
  stationId: string;
  fuelType: FuelType;
  capacityLitres: number;
  currentLevelLitres: number;
  reorderLevelLitres: number;
  reorderQtyLitres: number;
  lastUpdated: Date;
}

export interface IStockMovement {
  id: string;
  tankId: string;
  type: StockMovementType;
  quantityLitres: number;
  balanceAfterLitres: number;
  reference: string | null;
  notes: string | null;
  createdById: string;
  createdAt: Date;
}

// ─── Daily Usage ──────────────────────────────────────────────────────────────

export interface IDailyUsageLog {
  id: string;
  tankId: string;
  shiftType: ShiftType;
  date: Date;
  openingMeterReading: number;
  closingMeterReading: number;
  openingStockLitres: number;
  closingStockLitres: number;
  dispensedLitres: number;
  cashSalesLkr: number;
  creditSalesLkr: number;
  varianceLitres: number;
  workerNotes: string | null;
  recordedById: string;
  approvedById: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export interface IPurchaseOrder {
  id: string;
  stationId: string;
  supplierId: string;
  status: OrderStatus;
  orderDate: Date;
  expectedDeliveryDate: Date | null;
  deliveredAt: Date | null;
  totalAmountLkr: number;
  items: IPurchaseOrderItem[];
  createdById: string;
  approvedById: string | null;
}

export interface IPurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  fuelType: FuelType;
  quantityLitres: number;
  pricePerLitreLkr: number;
  totalAmountLkr: number;
}

// ─── Financial ────────────────────────────────────────────────────────────────

export interface ITransaction {
  id: string;
  stationId: string;
  category: TransactionCategory;
  description: string;
  amountLkr: number;
  taxAmountLkr: number;
  netAmountLkr: number;
  paymentMethod: PaymentMethod;
  transactionDate: Date;
  reference: string | null;
  createdById: string;
}

export interface ITaxEntry {
  id: string;
  stationId: string;
  taxType: TaxType;
  period: TaxPeriod;
  periodStart: Date;
  periodEnd: Date;
  grossAmountLkr: number;
  taxableAmountLkr: number;
  taxRatePercent: number;
  taxAmountLkr: number;
  isPaid: boolean;
  paidAt: Date | null;
  filingReference: string | null;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface IReportRequest {
  type: ReportType;
  stationId: string | null;  // null = all stations
  periodStart: Date;
  periodEnd: Date;
  format: 'PDF' | 'EXCEL' | 'JSON';
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface StockUpdateEvent {
  tankId: string;
  stationId: string;
  fuelType: FuelType;
  currentLevelLitres: number;
  percentageFull: number;
  isLow: boolean;
}

export interface LowStockAlertEvent {
  tankId: string;
  stationId: string;
  stationName: string;
  fuelType: FuelType;
  currentLevelLitres: number;
  reorderLevelLitres: number;
}
