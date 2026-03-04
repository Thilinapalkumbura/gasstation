import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SparePartsService } from './spare-parts.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';
import { PaymentMethod } from '@gasstation/shared-types';

const mockEvents = { emit: jest.fn() };

const part = {
  id: 'part-1',
  stationId: 'station-1',
  sku: 'OIL-FILTER-001',
  name: 'Oil Filter Toyota',
  brand: 'Denso',
  category: 'Filters',
  unitPriceLkr: 1200,
  costPriceLkr: 850,
  currentStock: 25,
  reorderLevel: 5,
  isActive: true,
  station: { id: 'station-1', name: 'Main Station' },
};

const createPartDto = {
  stationId: 'station-1',
  sku: 'NEW-PART-001',
  name: 'New Part',
  unitPriceLkr: 500,
  costPriceLkr: 350,
};

const createSaleDto = {
  stationId: 'station-1',
  paymentMethod: PaymentMethod.CASH,
  saleDate: '2026-03-03',
  items: [{ sparePartId: 'part-1', quantity: 2, unitPriceLkr: 1200 }],
};

describe('SparePartsService', () => {
  let service: SparePartsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparePartsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    service = module.get(SparePartsService);
    jest.clearAllMocks();
  });

  // ── createPart ────────────────────────────────────────────────────────────

  describe('createPart', () => {
    it('creates a new spare part', async () => {
      prisma.station.findUnique.mockResolvedValue({ id: 'station-1' });
      prisma.sparePart.findUnique.mockResolvedValue(null); // no sku conflict
      prisma.sparePart.create.mockResolvedValue({ ...part, sku: 'NEW-PART-001' });

      const result = await service.createPart(createPartDto as any);

      expect(prisma.sparePart.create).toHaveBeenCalled();
      expect(result.sku).toBe('NEW-PART-001');
    });

    it('throws NotFoundException when station not found', async () => {
      prisma.station.findUnique.mockResolvedValue(null);

      await expect(service.createPart(createPartDto as any)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when SKU already exists for that station', async () => {
      prisma.station.findUnique
        .mockResolvedValueOnce({ id: 'station-1' })   // station check passes
        .mockResolvedValueOnce({ id: 'station-1' });  // (if called again)
      prisma.sparePart.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createPart(createPartDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ── getParts ──────────────────────────────────────────────────────────────

  describe('getParts', () => {
    it('returns parts filtered by stationId for STATION_MANAGER', async () => {
      prisma.sparePart.findMany.mockResolvedValue([part]);

      const result = await service.getParts({} as any, 'station-1');

      expect(result).toHaveLength(1);
      expect(prisma.sparePart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: 'station-1' }) }),
      );
    });

    it('returns all parts when no stationId (BACK_OFFICE)', async () => {
      prisma.sparePart.findMany.mockResolvedValue([part]);

      await service.getParts({} as any, null);

      expect(prisma.sparePart.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ stationId: expect.anything() }) }),
      );
    });
  });

  // ── getLowStock ───────────────────────────────────────────────────────────

  describe('getLowStock', () => {
    it('returns only parts at or below reorder level', async () => {
      prisma.sparePart.findMany.mockResolvedValue([
        { ...part, currentStock: 3, reorderLevel: 5 },   // low
        { ...part, id: 'part-2', currentStock: 20, reorderLevel: 5 }, // fine
      ]);

      const result = await service.getLowStock('station-1');

      expect(result).toHaveLength(1);
      expect(result[0].currentStock).toBe(3);
    });
  });

  // ── createSale ────────────────────────────────────────────────────────────

  describe('createSale', () => {
    const makeTx = (saleCreate = jest.fn().mockResolvedValue({ id: 'sale-1', totalAmountLkr: 2400 })) => ({
      transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
      sparePartSale: { create: saleCreate },
      sparePart: { update: jest.fn().mockResolvedValue(part) },
    });

    beforeEach(() => {
      prisma.station.findUnique.mockResolvedValue({ id: 'station-1' });
      prisma.sparePart.findUnique.mockResolvedValue(part);
      prisma.sparePart.findMany.mockResolvedValue([]); // post-sale reorder check
      prisma.$transaction.mockImplementation(async (fn: any) => fn(makeTx()));
    });

    it('creates a sale and returns it', async () => {
      await service.createSale(createSaleDto as any, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when station not found', async () => {
      prisma.station.findUnique.mockResolvedValue(null);

      await expect(service.createSale(createSaleDto as any, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when spare part not found', async () => {
      prisma.sparePart.findUnique.mockResolvedValue(null);

      await expect(service.createSale(createSaleDto as any, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when insufficient stock', async () => {
      prisma.sparePart.findUnique.mockResolvedValue({ ...part, currentStock: 1 });
      // quantity = 2, stock = 1

      await expect(service.createSale(createSaleDto as any, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('calculates totalAmountLkr correctly from line items', async () => {
      const saleCreate = jest.fn().mockResolvedValue({ id: 'sale-1' });
      prisma.$transaction.mockImplementationOnce(async (fn: any) => fn(makeTx(saleCreate)));

      await service.createSale(createSaleDto as any, 'user-1');

      // 2 units × Rs 1200 = Rs 2400
      expect(saleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalAmountLkr: 2400 }),
        }),
      );
    });
  });

  // ── createStockIn ─────────────────────────────────────────────────────────

  describe('createStockIn', () => {
    const stockInDto = {
      stationId: 'station-1',
      sparePartId: 'part-1',
      quantity: 10,
      costPriceLkr: 850,
      receivedAt: '2026-03-03',
    };

    it('increases currentStock and creates stockIn record', async () => {
      prisma.sparePart.findUnique.mockResolvedValue(part);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          sparePartStockIn: { create: jest.fn().mockResolvedValue({ id: 'si-1' }) },
          sparePart: { update: jest.fn().mockResolvedValue({ ...part, currentStock: 35 }) },
        }),
      );

      await service.createStockIn(stockInDto as any, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when part not found', async () => {
      prisma.sparePart.findUnique.mockResolvedValue(null);

      await expect(service.createStockIn(stockInDto as any, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updatePart ────────────────────────────────────────────────────────────

  describe('updatePart', () => {
    it('updates and returns the part', async () => {
      prisma.sparePart.findUnique.mockResolvedValue(part);
      prisma.sparePart.update.mockResolvedValue({ ...part, unitPriceLkr: 1400 });

      const result = await service.updatePart('part-1', { unitPriceLkr: 1400 } as any);

      expect(result.unitPriceLkr).toBe(1400);
    });

    it('throws NotFoundException when part not found', async () => {
      prisma.sparePart.findUnique.mockResolvedValue(null);

      await expect(service.updatePart('bad-id', {})).rejects.toThrow(NotFoundException);
    });
  });
});
