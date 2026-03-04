import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CarWashService } from './car-wash.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';
import { CarWashType, PaymentMethod } from '@gasstation/shared-types';

const createJobDto = {
  stationId: 'station-1',
  vehicleNumber: 'CAA-1234',
  washType: CarWashType.STANDARD,
  amountLkr: 1500,
  paymentMethod: PaymentMethod.CASH,
  washDate: '2026-03-03',
};

const jobRecord = {
  id: 'job-1',
  ...createJobDto,
  amountLkr: 1500,
  washDate: new Date('2026-03-03'),
  notes: null,
  createdById: 'user-1',
  transactionId: 'tx-1',
  station: { id: 'station-1', name: 'Main Station' },
  createdBy: { id: 'user-1', fullName: 'Worker' },
};

describe('CarWashService', () => {
  let service: CarWashService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarWashService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CarWashService);
    jest.clearAllMocks();
  });

  // ── createJob ─────────────────────────────────────────────────────────────

  describe('createJob', () => {
    beforeEach(() => {
      prisma.station.findUnique.mockResolvedValue({ id: 'station-1' });
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          carWashJob: { create: jest.fn().mockResolvedValue(jobRecord) },
        }),
      );
    });

    it('creates a job and returns it', async () => {
      const result = await service.createJob(createJobDto, 'user-1');

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when station not found', async () => {
      prisma.station.findUnique.mockResolvedValue(null);

      await expect(service.createJob(createJobDto, 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getJobs ───────────────────────────────────────────────────────────────

  describe('getJobs', () => {
    it('returns paginated jobs list', async () => {
      prisma.carWashJob.findMany.mockResolvedValue([jobRecord]);
      prisma.carWashJob.count.mockResolvedValue(1);

      const result = await service.getJobs({ limit: 20, offset: 0 } as any, 'STATION_MANAGER', 'station-1');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by stationId for STATION_MANAGER role', async () => {
      prisma.carWashJob.findMany.mockResolvedValue([]);
      prisma.carWashJob.count.mockResolvedValue(0);

      await service.getJobs({ stationId: 'other', limit: 20, offset: 0 } as any, 'STATION_MANAGER', 'station-1');

      expect(prisma.carWashJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: 'station-1' }) }),
      );
    });

    it('allows BACK_OFFICE to filter by any stationId', async () => {
      prisma.carWashJob.findMany.mockResolvedValue([]);
      prisma.carWashJob.count.mockResolvedValue(0);

      await service.getJobs({ stationId: 'station-2', limit: 20, offset: 0 } as any, 'BACK_OFFICE', null);

      expect(prisma.carWashJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: 'station-2' }) }),
      );
    });
  });

  // ── getSummary ────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns correct job count and total revenue', async () => {
      prisma.carWashJob.findMany.mockResolvedValue([
        { ...jobRecord, amountLkr: 1500, washType: CarWashType.STANDARD },
        { ...jobRecord, id: 'job-2', amountLkr: 3000, washType: CarWashType.PREMIUM },
      ]);

      const summary = await service.getSummary({} as any, 'STATION_MANAGER', 'station-1');

      expect(summary.totalJobs).toBe(2);
      expect(summary.totalRevenue).toBe(4500);
      expect(summary.byType).toHaveLength(2);
    });

    it('returns zero values when no jobs found', async () => {
      prisma.carWashJob.findMany.mockResolvedValue([]);

      const summary = await service.getSummary({} as any, 'STATION_MANAGER', 'station-1');

      expect(summary.totalJobs).toBe(0);
      expect(summary.totalRevenue).toBe(0);
    });
  });
});
