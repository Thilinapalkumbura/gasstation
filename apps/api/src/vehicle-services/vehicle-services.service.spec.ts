import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VehicleServicesService } from './vehicle-services.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';
import { VehicleServiceType, PaymentMethod } from '@gasstation/shared-types';

const createJobDto = {
  stationId: 'station-1',
  vehicleNumber: 'CAA-9999',
  serviceType: VehicleServiceType.OIL_CHANGE,
  amountLkr: 5500,
  paymentMethod: PaymentMethod.CASH,
  serviceDate: '2026-03-03',
};

const jobRecord = {
  id: 'svc-1',
  ...createJobDto,
  amountLkr: 5500,
  serviceDate: new Date('2026-03-03'),
  notes: null,
  createdById: 'user-1',
  transactionId: 'tx-1',
  station: { id: 'station-1', name: 'Main Station' },
  createdBy: { id: 'user-1', fullName: 'Mechanic' },
};

describe('VehicleServicesService', () => {
  let service: VehicleServicesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleServicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(VehicleServicesService);
    jest.clearAllMocks();
  });

  // ── createJob ─────────────────────────────────────────────────────────────

  describe('createJob', () => {
    beforeEach(() => {
      prisma.station.findUnique.mockResolvedValue({ id: 'station-1' });
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          transaction: { create: jest.fn().mockResolvedValue({ id: 'tx-1' }) },
          serviceJob: { create: jest.fn().mockResolvedValue(jobRecord) },
        }),
      );
    });

    it('creates a service job successfully', async () => {
      const result = await service.createJob(createJobDto, 'user-1');

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws NotFoundException when station not found', async () => {
      prisma.station.findUnique.mockResolvedValue(null);

      await expect(service.createJob(createJobDto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('records a financial transaction when creating a job', async () => {
      const txCreate = jest.fn().mockResolvedValue({ id: 'tx-1' });
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          transaction: { create: txCreate },
          serviceJob: { create: jest.fn().mockResolvedValue(jobRecord) },
        }),
      );

      await service.createJob(createJobDto, 'user-1');

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amountLkr: 5500,
            stationId: 'station-1',
          }),
        }),
      );
    });
  });

  // ── getJobs ───────────────────────────────────────────────────────────────

  describe('getJobs', () => {
    it('returns paginated jobs', async () => {
      prisma.serviceJob.findMany.mockResolvedValue([jobRecord]);
      prisma.serviceJob.count.mockResolvedValue(1);

      const result = await service.getJobs({ limit: 20, offset: 0 } as any, 'STATION_MANAGER', 'station-1');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('scopes query to stationId for STATION_MANAGER', async () => {
      prisma.serviceJob.findMany.mockResolvedValue([]);
      prisma.serviceJob.count.mockResolvedValue(0);

      await service.getJobs({} as any, 'STATION_MANAGER', 'station-1');

      expect(prisma.serviceJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ stationId: 'station-1' }) }),
      );
    });
  });

  // ── getSummary ────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns correct totals and breakdown by service type', async () => {
      prisma.serviceJob.findMany.mockResolvedValue([
        { ...jobRecord, amountLkr: 5500, serviceType: VehicleServiceType.OIL_CHANGE },
        { ...jobRecord, id: 'svc-2', amountLkr: 8000, serviceType: VehicleServiceType.BRAKE_SERVICE },
        { ...jobRecord, id: 'svc-3', amountLkr: 5500, serviceType: VehicleServiceType.OIL_CHANGE },
      ]);

      const summary = await service.getSummary({} as any, 'STATION_MANAGER', 'station-1');

      expect(summary.totalJobs).toBe(3);
      expect(summary.totalRevenue).toBe(19000);
      expect(summary.byType.find((b: any) => b.serviceType === VehicleServiceType.OIL_CHANGE)?.count).toBe(2);
    });
  });
});
