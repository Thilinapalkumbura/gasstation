import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StockService } from './stock.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';
import { StockMovementType } from '@gasstation/shared-types';

const mockEvents = { emit: jest.fn() };

const baseTank = {
  id: 'tank-1',
  stationId: 'station-1',
  fuelType: 'PETROL_92',
  capacityLitres: 30000,
  currentLevelLitres: 18000,
  reorderLevelLitres: 8000,
  reorderQtyLitres: 20000,
  lastUpdated: new Date(),
  station: { id: 'station-1', name: 'Main Station', city: 'Colombo' },
};

describe('StockService', () => {
  let service: StockService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    service = module.get(StockService);
    jest.clearAllMocks();
  });

  // ── getTanks ──────────────────────────────────────────────────────────────

  describe('getTanks', () => {
    it('returns formatted tanks with computed fields', async () => {
      prisma.tank.findMany.mockResolvedValue([baseTank]);

      const result = await service.getTanks('station-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        percentageFull: 60,        // 18000/30000
        isLow: false,              // 18000 > 8000
        isCritical: false,
        availableLitres: 12000,
      });
    });

    it('marks tank as low when below reorder level', async () => {
      prisma.tank.findMany.mockResolvedValue([{ ...baseTank, currentLevelLitres: 5000 }]);

      const [tank] = await service.getTanks('station-1');

      expect(tank.isLow).toBe(true);
      expect(tank.isCritical).toBe(false);
    });

    it('marks tank as critical when below 50% of reorder level', async () => {
      prisma.tank.findMany.mockResolvedValue([{ ...baseTank, currentLevelLitres: 3000 }]);

      const [tank] = await service.getTanks('station-1');

      expect(tank.isCritical).toBe(true);
    });

    it('returns all tanks when no stationId provided', async () => {
      prisma.tank.findMany.mockResolvedValue([baseTank]);

      await service.getTanks();

      expect(prisma.tank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  // ── getTank ───────────────────────────────────────────────────────────────

  describe('getTank', () => {
    it('returns single formatted tank', async () => {
      prisma.tank.findUnique.mockResolvedValue(baseTank);

      const result = await service.getTank('tank-1');

      expect(result.id).toBe('tank-1');
    });

    it('throws NotFoundException when tank not found', async () => {
      prisma.tank.findUnique.mockResolvedValue(null);

      await expect(service.getTank('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getStationSummary ─────────────────────────────────────────────────────

  describe('getStationSummary', () => {
    it('returns summary with correct aggregate totals', async () => {
      prisma.tank.findMany.mockResolvedValue([
        { ...baseTank, capacityLitres: 30000, currentLevelLitres: 18000 },
        { ...baseTank, id: 'tank-2', fuelType: 'AUTO_DIESEL', capacityLitres: 40000, currentLevelLitres: 25000 },
      ]);

      const summary = await service.getStationSummary('station-1');

      expect(summary.totalCapacityLitres).toBe(70000);
      expect(summary.totalCurrentLitres).toBe(43000);
      expect(summary.overallPercentage).toBeCloseTo(61.4, 0);
      expect(summary.lowStockCount).toBe(0);
    });
  });

  // ── recordMovement ────────────────────────────────────────────────────────

  describe('recordMovement', () => {
    const deliveryDto = {
      tankId: 'tank-1',
      type: StockMovementType.DELIVERY_IN,
      quantityLitres: 5000,
      unitCostLkr: 340,
      reference: 'GRN-001',
    };

    beforeEach(() => {
      prisma.tank.findUnique.mockResolvedValue(baseTank);
      prisma.$transaction.mockImplementation(async (ops: any[]) => {
        return [
          { id: 'mov-1' },
          { ...baseTank, currentLevelLitres: 23000, station: baseTank.station },
        ];
      });
      prisma.auditLog.create.mockResolvedValue({});
    });

    it('records a DELIVERY_IN movement and emits stock.updated', async () => {
      const result = await service.recordMovement(deliveryDto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockEvents.emit).toHaveBeenCalledWith('stock.updated', expect.any(Object));
      expect(result.movement).toBeDefined();
      expect(result.tank).toBeDefined();
    });

    it('throws NotFoundException when tank does not exist', async () => {
      prisma.tank.findUnique.mockResolvedValue(null);

      await expect(service.recordMovement(deliveryDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when DISPENSED_OUT exceeds stock', async () => {
      const dto = { ...deliveryDto, type: StockMovementType.DISPENSED_OUT, quantityLitres: 20000 };

      await expect(service.recordMovement(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when DELIVERY_IN would exceed capacity', async () => {
      const dto = { ...deliveryDto, quantityLitres: 15000 }; // 18000 + 15000 = 33000 > 30000

      await expect(service.recordMovement(dto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('emits stock.low alert when updated tank is below reorder level', async () => {
      // Simulate tank going below reorder level after movement
      prisma.$transaction.mockImplementationOnce(async () => [
        { id: 'mov-1' },
        { ...baseTank, currentLevelLitres: 5000, station: baseTank.station },
      ]);

      await service.recordMovement({ ...deliveryDto, type: StockMovementType.DISPENSED_OUT, quantityLitres: 5000 }, 'user-1');

      expect(mockEvents.emit).toHaveBeenCalledWith('stock.low', expect.any(Object));
    });

    it('sets ADJUSTMENT balance directly from quantityLitres', async () => {
      const adjustDto = { ...deliveryDto, type: StockMovementType.ADJUSTMENT, quantityLitres: 15000 };
      prisma.$transaction.mockImplementationOnce(async (ops: any[]) => [
        { id: 'mov-1' },
        { ...baseTank, currentLevelLitres: 15000, station: baseTank.station },
      ]);

      const result = await service.recordMovement(adjustDto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── updateReorderSettings ─────────────────────────────────────────────────

  describe('updateReorderSettings', () => {
    it('updates reorder thresholds successfully', async () => {
      prisma.tank.findUnique.mockResolvedValue(baseTank);
      prisma.tank.update.mockResolvedValue({ ...baseTank, reorderLevelLitres: 10000, reorderQtyLitres: 25000 });

      const result = await service.updateReorderSettings('tank-1', {
        reorderLevelLitres: 10000,
        reorderQtyLitres: 25000,
      });

      expect(result.reorderLevelLitres).toBe(10000);
    });

    it('throws NotFoundException when tank not found', async () => {
      prisma.tank.findUnique.mockResolvedValue(null);

      await expect(service.updateReorderSettings('bad-id', { reorderLevelLitres: 5000, reorderQtyLitres: 10000 }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── getMovements ──────────────────────────────────────────────────────────

  describe('getMovements', () => {
    it('returns paginated movement history', async () => {
      prisma.stockMovement.findMany.mockResolvedValue([{ id: 'mov-1' }]);
      prisma.stockMovement.count.mockResolvedValue(1);

      const result = await service.getMovements({ limit: 10, offset: 0 } as any);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
