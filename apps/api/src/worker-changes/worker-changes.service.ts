import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkerChangeDto } from './dto/create-worker-change.dto';
import { ReviewWorkerChangeDto } from './dto/review-worker-change.dto';
import { UserRole } from '@gasstation/shared-types';

const REQUEST_INCLUDE = {
  worker: { select: { id: true, fullName: true, role: true, stationId: true, workerType: true } },
  requestedBy: { select: { id: true, fullName: true, role: true } },
  reviewedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class WorkerChangesService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(dto: CreateWorkerChangeDto, requestedById: string) {
    const worker = await this.prisma.user.findUnique({ where: { id: dto.workerId } });
    if (!worker) throw new NotFoundException('Worker not found');
    if (worker.role !== UserRole.WORKER) {
      throw new BadRequestException('Target user must have WORKER role');
    }

    const hasChange =
      dto.newWorkerType !== undefined ||
      dto.newFullName !== undefined ||
      dto.newStationId !== undefined ||
      dto.newIsActive !== undefined;

    if (!hasChange) {
      throw new BadRequestException('At least one change field must be provided');
    }

    return this.prisma.workerChangeRequest.create({
      data: {
        workerId: dto.workerId,
        requestedById,
        newWorkerType: dto.newWorkerType,
        newFullName: dto.newFullName,
        newStationId: dto.newStationId,
        newIsActive: dto.newIsActive,
      },
      include: REQUEST_INCLUDE,
    });
  }

  async getRequests(
    query: { status?: string; workerId?: string },
    userRole: string,
    userStationId: string | null,
    userId: string,
  ) {
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.workerId) where.workerId = query.workerId;

    if (userRole === UserRole.BACK_OFFICE) {
      where.requestedById = userId;
    } else if (userRole === UserRole.STATION_MANAGER && userStationId) {
      where.worker = { stationId: userStationId };
    }
    // ADMIN sees all

    return this.prisma.workerChangeRequest.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, reviewerId: string) {
    const request = await this.prisma.workerChangeRequest.findUnique({
      where: { id },
      include: { worker: true },
    });
    if (!request) throw new NotFoundException('Change request not found');
    if (request.status !== 'PENDING') {
      throw new ConflictException('Only PENDING requests can be approved');
    }

    const userUpdateData: any = {};
    if (request.newWorkerType !== null) userUpdateData.workerType = request.newWorkerType;
    if (request.newFullName !== null) userUpdateData.fullName = request.newFullName;
    if (request.newStationId !== null) userUpdateData.stationId = request.newStationId;
    if (request.newIsActive !== null) userUpdateData.isActive = request.newIsActive;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: request.workerId },
          data: userUpdateData,
        });
      }

      return tx.workerChangeRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
        include: REQUEST_INCLUDE,
      });
    });
  }

  async reject(id: string, reviewerId: string, dto: ReviewWorkerChangeDto) {
    const request = await this.prisma.workerChangeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Change request not found');
    if (request.status !== 'PENDING') {
      throw new ConflictException('Only PENDING requests can be rejected');
    }

    return this.prisma.workerChangeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewerNotes: dto.reviewerNotes,
      },
      include: REQUEST_INCLUDE,
    });
  }
}
