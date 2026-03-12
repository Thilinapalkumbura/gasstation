import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { WorkerChangesService } from './worker-changes.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';
import { WorkerType } from '@gasstation/shared-types';

const worker = {
  id: 'worker-1',
  fullName: 'John Worker',
  email: 'john@example.com',
  role: 'WORKER',
  isActive: true,
  workerType: null,
  stationId: 'station-1',
};

const nonWorker = {
  id: 'user-2',
  fullName: 'Jane Manager',
  email: 'jane@example.com',
  role: 'STATION_MANAGER',
  isActive: true,
  workerType: null,
  stationId: 'station-1',
};

const pendingRequest = {
  id: 'req-1',
  workerId: 'worker-1',
  requestedById: 'bo-1',
  status: 'PENDING',
  newWorkerType: WorkerType.SHIFT,
  newFullName: null,
  newStationId: null,
  newIsActive: null,
  reviewedById: null,
  reviewedAt: null,
  reviewerNotes: null,
  createdAt: new Date(),
  worker,
};

const approvedRequest = { ...pendingRequest, id: 'req-2', status: 'APPROVED' };

describe('WorkerChangesService', () => {
  let service: WorkerChangesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerChangesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WorkerChangesService);
    jest.clearAllMocks();
  });

  // ── createRequest ─────────────────────────────────────────────────────────

  describe('createRequest', () => {
    it('creates a change request for a valid worker', async () => {
      prisma.user.findUnique.mockResolvedValue(worker);
      prisma.workerChangeRequest.create.mockResolvedValue(pendingRequest);

      const result = await service.createRequest(
        { workerId: 'worker-1', newWorkerType: WorkerType.SHIFT },
        'bo-1',
      );

      expect(result.status).toBe('PENDING');
      expect(prisma.workerChangeRequest.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when worker not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createRequest({ workerId: 'bad-id', newWorkerType: WorkerType.SHIFT }, 'bo-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when target user is not WORKER role', async () => {
      prisma.user.findUnique.mockResolvedValue(nonWorker);

      await expect(
        service.createRequest({ workerId: 'user-2', newWorkerType: WorkerType.SHIFT }, 'bo-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no change fields provided', async () => {
      prisma.user.findUnique.mockResolvedValue(worker);

      await expect(
        service.createRequest({ workerId: 'worker-1' }, 'bo-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getRequests ───────────────────────────────────────────────────────────

  describe('getRequests', () => {
    it('returns requests filtered for BACK_OFFICE by requestedById', async () => {
      prisma.workerChangeRequest.findMany.mockResolvedValue([pendingRequest]);

      const result = await service.getRequests({}, 'BACK_OFFICE', null, 'bo-1');

      expect(result).toHaveLength(1);
      expect(prisma.workerChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ requestedById: 'bo-1' }),
        }),
      );
    });

    it('returns all requests for ADMIN', async () => {
      prisma.workerChangeRequest.findMany.mockResolvedValue([pendingRequest, approvedRequest]);

      const result = await service.getRequests({}, 'ADMIN', null, 'admin-1');

      expect(result).toHaveLength(2);
      expect(prisma.workerChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ requestedById: expect.anything() }),
        }),
      );
    });
  });

  // ── approve ───────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('approves a PENDING request and updates worker in a transaction', async () => {
      prisma.workerChangeRequest.findUnique.mockResolvedValue(pendingRequest);

      const userUpdate = jest.fn().mockResolvedValue(worker);
      const requestUpdate = jest.fn().mockResolvedValue({ ...pendingRequest, status: 'APPROVED' });

      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          user: { update: userUpdate },
          workerChangeRequest: { update: requestUpdate },
        }),
      );

      const result = await service.approve('req-1', 'manager-1');

      expect(result.status).toBe('APPROVED');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'worker-1' },
          data: expect.objectContaining({ workerType: WorkerType.SHIFT }),
        }),
      );
      expect(requestUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', reviewedById: 'manager-1' }),
        }),
      );
    });

    it('throws NotFoundException when request not found', async () => {
      prisma.workerChangeRequest.findUnique.mockResolvedValue(null);

      await expect(service.approve('bad-id', 'manager-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when request is not PENDING', async () => {
      prisma.workerChangeRequest.findUnique.mockResolvedValue(approvedRequest);

      await expect(service.approve('req-2', 'manager-1')).rejects.toThrow(ConflictException);
    });
  });

  // ── reject ────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('rejects a PENDING request with notes', async () => {
      prisma.workerChangeRequest.findUnique.mockResolvedValue(pendingRequest);
      prisma.workerChangeRequest.update.mockResolvedValue({
        ...pendingRequest,
        status: 'REJECTED',
        reviewerNotes: 'Not approved',
      });

      const result = await service.reject('req-1', 'manager-1', { reviewerNotes: 'Not approved' });

      expect(result.status).toBe('REJECTED');
      expect(prisma.workerChangeRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REJECTED',
            reviewedById: 'manager-1',
            reviewerNotes: 'Not approved',
          }),
        }),
      );
    });

    it('throws NotFoundException when request not found', async () => {
      prisma.workerChangeRequest.findUnique.mockResolvedValue(null);

      await expect(service.reject('bad-id', 'manager-1', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when request is not PENDING', async () => {
      prisma.workerChangeRequest.findUnique.mockResolvedValue(approvedRequest);

      await expect(service.reject('req-2', 'manager-1', {})).rejects.toThrow(ConflictException);
    });
  });
});
