import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UsageService } from './usage.service';
import { StockService } from '../stock/stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';
import { ShiftType, UsageLogStatus, UserRole } from '@gasstation/shared-types';

const mockEvents = { emit: jest.fn() };
const mockStockService = { recordMovement: jest.fn() };

const tank = {
  id: 'tank-1',
  stationId: 'station-1',
  fuelType: 'PETROL_92',
  currentLevelLitres: 18000,
  capacityLitres: 30000,
  station: { id: 'station-1', name: 'Main Station' },
};

const createLogDto = {
  tankId: 'tank-1',
  shiftType: ShiftType.MORNING,
  date: '2026-03-03',
  openingMeterReading: 100000,
  closingMeterReading: 101200,  // 1200 L dispensed by meter
  openingStockLitres: 18000,
  closingStockLitres: 16900,    // 1100 L from tank → variance = 100
  pricePerLitreLkr: 340,
  cashSalesLkr: 380000,
  creditSalesLkr: 28000,
};

const pendingLog = {
  id: 'log-1',
  tankId: 'tank-1',
  tank: { id: 'tank-1', stationId: 'station-1', fuelType: 'PETROL_92', station: { id: 'station-1', name: 'Main' } },
  shiftType: ShiftType.MORNING,
  date: new Date('2026-03-03'),
  status: UsageLogStatus.PENDING,
  meterDispensedLitres: 1200,
  tankDispensedLitres: 1100,
  varianceLitres: 100,
  recordedById: 'worker-1',
  pricePerLitreLkr: 340,
  cashSalesLkr: 380000,
  creditSalesLkr: 28000,
  totalSalesLkr: 408000,
};

describe('UsageService', () => {
  let service: UsageService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: PrismaService, useValue: prisma },
        { provide: StockService, useValue: mockStockService },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    service = module.get(UsageService);
    jest.clearAllMocks();
  });

  // ── createLog ─────────────────────────────────────────────────────────────

  describe('createLog', () => {
    beforeEach(() => {
      prisma.tank.findUnique.mockResolvedValue(tank);
      prisma.dailyUsageLog.findUnique.mockResolvedValue(null); // no duplicate
      prisma.dailyUsageLog.findFirst.mockResolvedValue(null);  // no prev log
      prisma.dailyUsageLog.create.mockResolvedValue({ ...pendingLog, id: 'log-new' });
      prisma.auditLog.create.mockResolvedValue({});
    });

    it('creates a usage log with PENDING status', async () => {
      await service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'station-1');

      expect(prisma.dailyUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: UsageLogStatus.PENDING }),
        }),
      );
    });

    it('throws NotFoundException when tank not found', async () => {
      prisma.tank.findUnique.mockResolvedValue(null);

      await expect(service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'station-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when worker logs usage for a different station', async () => {
      await expect(service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'other-station'))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when log for same tank/date/shift already exists', async () => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue({ id: 'existing-log' });

      await expect(service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'station-1'))
        .rejects.toThrow(ConflictException);
    });

    it('calculates dispensedLitres = closingMeter - openingMeter', async () => {
      await service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'station-1');

      expect(prisma.dailyUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ dispensedLitres: expect.anything() }),
        }),
      );
    });

    it('calculates physicalDispensedLitres = openingStock - closingStock', async () => {
      await service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'station-1');

      expect(prisma.dailyUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ physicalDispensedLitres: expect.anything() }),
        }),
      );
    });

    it('calculates varianceLitres = dispensedLitres - physicalDispensedLitres', async () => {
      await service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'station-1');

      expect(prisma.dailyUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ varianceLitres: expect.anything() }),
        }),
      );
    });

    it('throws BadRequestException when closing meter < opening meter', async () => {
      const dto = { ...createLogDto, closingMeterReading: 99000 }; // less than opening

      await expect(service.createLog(dto, 'worker-1', UserRole.WORKER, 'station-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('emits usage.submitted event after creation', async () => {
      await service.createLog(createLogDto, 'worker-1', UserRole.WORKER, 'station-1');

      expect(mockEvents.emit).toHaveBeenCalledWith('usage.submitted', expect.any(Object));
    });
  });

  // ── approveLog ────────────────────────────────────────────────────────────

  describe('approveLog', () => {
    beforeEach(() => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue(pendingLog);
      prisma.dailyUsageLog.update.mockResolvedValue({ ...pendingLog, status: UsageLogStatus.APPROVED });
      mockStockService.recordMovement.mockResolvedValue({ movement: { id: 'mov-1' } });
      prisma.auditLog.create.mockResolvedValue({});
    });

    it('sets status to APPROVED', async () => {
      await service.approveLog('log-1', 'manager-1');

      expect(prisma.dailyUsageLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: UsageLogStatus.APPROVED, approvedById: 'manager-1' }),
        }),
      );
    });

    it('throws NotFoundException when log not found', async () => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue(null);

      await expect(service.approveLog('bad-id', 'manager-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when log is already approved', async () => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue({ ...pendingLog, status: UsageLogStatus.APPROVED });

      await expect(service.approveLog('log-1', 'manager-1')).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when log is not in an approvable state', async () => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue({ ...pendingLog, status: UsageLogStatus.REJECTED });

      await expect(service.approveLog('log-1', 'manager-1')).rejects.toThrow(BadRequestException);
    });

    it('emits usage.approved event', async () => {
      await service.approveLog('log-1', 'manager-1');

      expect(mockEvents.emit).toHaveBeenCalledWith('usage.approved', expect.any(Object));
    });
  });

  // ── rejectLog ─────────────────────────────────────────────────────────────

  describe('rejectLog', () => {
    beforeEach(() => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue(pendingLog);
      prisma.dailyUsageLog.update.mockResolvedValue({ ...pendingLog, status: UsageLogStatus.REJECTED });
      prisma.auditLog.create.mockResolvedValue({});
    });

    it('sets status to REJECTED with rejection notes', async () => {
      await service.rejectLog('log-1', 'manager-1', { rejectionNotes: 'Meter reading discrepancy' });

      expect(prisma.dailyUsageLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UsageLogStatus.REJECTED,
            rejectionNotes: 'Meter reading discrepancy',
          }),
        }),
      );
    });

    it('throws NotFoundException when log not found', async () => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue(null);

      await expect(service.rejectLog('bad-id', 'manager-1', { rejectionNotes: 'reason' }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when log is already approved', async () => {
      prisma.dailyUsageLog.findUnique.mockResolvedValue({ ...pendingLog, status: UsageLogStatus.APPROVED });

      await expect(service.rejectLog('log-1', 'manager-1', { rejectionNotes: 'reason' }))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── getLogs ───────────────────────────────────────────────────────────────

  describe('getLogs', () => {
    it('returns paginated logs for a manager scoped to their station', async () => {
      prisma.dailyUsageLog.findMany.mockResolvedValue([pendingLog]);
      prisma.dailyUsageLog.count.mockResolvedValue(5);

      const result = await service.getLogs(
        { limit: 10, offset: 0 } as any,
        'manager-1',
        UserRole.STATION_MANAGER,
        'station-1',
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });
});
