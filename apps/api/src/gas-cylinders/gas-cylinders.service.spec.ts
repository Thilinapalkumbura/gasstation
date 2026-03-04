import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GasCylindersService } from './gas-cylinders.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';
import { CylinderBrand, PaymentMethod } from '@gasstation/shared-types';

const mockEvents = { emit: jest.fn() };

const cylinder = {
  id: 'cyl-1',
  stationId: 'station-1',
  brand: CylinderBrand.LAUGFS,
  sizeKg: 12.5,
  sellingPriceLkr: 4200,
  purchasePriceLkr: 3500,
  fullStock: 15,
  emptyStock: 2,
  reorderLevel: 5,
  isActive: true,
  station: { id: 'station-1', name: 'Main Station' },
};

const createSaleDto = {
  stationId: 'station-1',
  gasCylinderId: 'cyl-1',
  isExchange: false,
  quantity: 3,
  amountLkr: 12600,
  paymentMethod: PaymentMethod.CASH,
  saleDate: '2026-03-03',
};

const createStockInDto = {
  stationId: 'station-1',
  gasCylinderId: 'cyl-1',
  quantity: 10,
  purchasePriceLkr: 3500,
  receivedAt: '2026-03-03',
};

describe('GasCylindersService', () => {
  let service: GasCylindersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GasCylindersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: mockEvents },
      ],
    }).compile();

    service = module.get(GasCylindersService);
    jest.clearAllMocks();
  });

  // ── createCylinder ────────────────────────────────────────────────────────

  describe('createCylinder', () => {
    it('creates a gas cylinder entry', async () => {
      prisma.station.findUnique.mockResolvedValue({ id: 'station-1' });
      prisma.gasCylinder.create.mockResolvedValue(cylinder);

      const result = await service.createCylinder({
        stationId: 'station-1',
        brand: CylinderBrand.LAUGFS,
        sizeKg: 12.5,
        sellingPriceLkr: 4200,
        purchasePriceLkr: 3500,
      });

      expect(result.brand).toBe(CylinderBrand.LAUGFS);
      expect(prisma.gasCylinder.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when station not found', async () => {
      prisma.station.findUnique.mockResolvedValue(null);

      await expect(service.createCylinder({ stationId: 'bad', brand: CylinderBrand.LAUGFS, sizeKg: 12.5, sellingPriceLkr: 1, purchasePriceLkr: 1 }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── getCylinders ──────────────────────────────────────────────────────────

  describe('getCylinders', () => {
    it('returns cylinders for a given station', async () => {
      prisma.gasCylinder.findMany.mockResolvedValue([cylinder]);

      const result = await service.getCylinders({} as any, 'station-1');

      expect(result).toHaveLength(1);
      expect(prisma.gasCylinder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: 'station-1' }) }),
      );
    });

    it('returns all cylinders when called as BACK_OFFICE (no stationId)', async () => {
      prisma.gasCylinder.findMany.mockResolvedValue([cylinder]);

      await service.getCylinders({} as any, null);

      expect(prisma.gasCylinder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ stationId: expect.anything() }) }),
      );
    });
  });

  // ── getLowStock ───────────────────────────────────────────────────────────

  describe('getLowStock', () => {
    it('returns cylinders with fullStock <= reorderLevel', async () => {
      prisma.gasCylinder.findMany.mockResolvedValue([
        { ...cylinder, fullStock: 3, reorderLevel: 5 },   // low
        { ...cylinder, id: 'cyl-2', fullStock: 20, reorderLevel: 5 }, // ok
      ]);

      const result = await service.getLowStock('station-1');

      expect(result).toHaveLength(1);
      expect(result[0].fullStock).toBe(3);
    });
  });

  // ── createSale ────────────────────────────────────────────────────────────

  describe('createSale', () => {
    beforeEach(() => {
      prisma.gasCylinder.findUnique.mockResolvedValue(cylinder);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          cylinderSale: { create: jest.fn().mockResolvedValue({ id: 'sale-1' }) },
          gasCylinder: { update: jest.fn().mockResolvedValue(cylinder) },
        }),
      );
    });

    it('creates a sale successfully', async () => {
      const result = await service.createSale(createSaleDto, 'user-1');

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when cylinder not found', async () => {
      prisma.gasCylinder.findUnique.mockResolvedValue(null);

      await expect(service.createSale(createSaleDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when fullStock is insufficient', async () => {
      prisma.gasCylinder.findUnique.mockResolvedValue({ ...cylinder, fullStock: 2 });
      // quantity = 3, fullStock = 2

      await expect(service.createSale(createSaleDto, 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('decrements fullStock by quantity on non-exchange sale', async () => {
      const cylinderUpdate = jest.fn().mockResolvedValue(cylinder);
      prisma.$transaction.mockImplementationOnce(async (fn: any) =>
        fn({
          transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          cylinderSale: { create: jest.fn().mockResolvedValue({ id: 'sale-1' }) },
          gasCylinder: { update: cylinderUpdate },
        }),
      );

      await service.createSale(createSaleDto, 'user-1');

      expect(cylinderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullStock: { decrement: 3 },
          }),
        }),
      );
    });

    it('increments emptyStock on exchange sale', async () => {
      const cylinderUpdate = jest.fn().mockResolvedValue(cylinder);
      prisma.$transaction.mockImplementationOnce(async (fn: any) =>
        fn({
          transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          cylinderSale: { create: jest.fn().mockResolvedValue({ id: 'sale-1' }) },
          gasCylinder: { update: cylinderUpdate },
        }),
      );

      await service.createSale({ ...createSaleDto, isExchange: true }, 'user-1');

      expect(cylinderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fullStock: { decrement: 3 },
            emptyStock: { increment: 3 },
          }),
        }),
      );
    });
  });

  // ── createStockIn ─────────────────────────────────────────────────────────

  describe('createStockIn', () => {
    beforeEach(() => {
      prisma.gasCylinder.findUnique.mockResolvedValue(cylinder);
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          cylinderStockIn: { create: jest.fn().mockResolvedValue({ id: 'si-1' }) },
          gasCylinder: { update: jest.fn().mockResolvedValue({ ...cylinder, fullStock: 25 }) },
        }),
      );
    });

    it('increases fullStock on stock-in', async () => {
      const result = await service.createStockIn(createStockInDto, 'user-1');

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when cylinder not found', async () => {
      prisma.gasCylinder.findUnique.mockResolvedValue(null);

      await expect(service.createStockIn(createStockInDto, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateCylinder ────────────────────────────────────────────────────────

  describe('updateCylinder', () => {
    it('updates cylinder fields', async () => {
      prisma.gasCylinder.findUnique.mockResolvedValue(cylinder);
      prisma.gasCylinder.update.mockResolvedValue({ ...cylinder, sellingPriceLkr: 4500 });

      const result = await service.updateCylinder('cyl-1', { sellingPriceLkr: 4500 });

      expect(result.sellingPriceLkr).toBe(4500);
    });

    it('throws NotFoundException when cylinder not found', async () => {
      prisma.gasCylinder.findUnique.mockResolvedValue(null);

      await expect(service.updateCylinder('bad-id', {})).rejects.toThrow(NotFoundException);
    });
  });
});
