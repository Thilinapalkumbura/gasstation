import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceJobDto } from './dto/create-service-job.dto';
import { ServiceJobQueryDto } from './dto/service-job-query.dto';
import { TransactionCategory } from '@gasstation/shared-types';

@Injectable()
export class VehicleServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private getFiscalPeriod(date: Date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const fiscalMonth = month >= 4 ? month - 3 : month + 9;
    const fiscalYear = month >= 4 ? year : year - 1;
    return { year: fiscalYear, month: fiscalMonth };
  }

  async createJob(dto: CreateServiceJobDto, userId: string) {
    const station = await this.prisma.station.findUnique({ where: { id: dto.stationId } });
    if (!station) throw new NotFoundException('Station not found');

    const serviceDate = new Date(dto.serviceDate);
    const fiscal = this.getFiscalPeriod(serviceDate);

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          stationId: dto.stationId,
          category: TransactionCategory.VEHICLE_SERVICE_SALE,
          description: `Vehicle service — ${dto.serviceType} for ${dto.vehicleNumber}`,
          amountLkr: dto.amountLkr,
          vatAmountLkr: 0,
          netAmountLkr: dto.amountLkr,
          paymentMethod: dto.paymentMethod,
          transactionDate: serviceDate,
          fiscalYear: fiscal.year,
          fiscalMonth: fiscal.month,
          createdById: userId,
        },
      });

      const job = await tx.serviceJob.create({
        data: {
          stationId: dto.stationId,
          vehicleNumber: dto.vehicleNumber,
          serviceType: dto.serviceType,
          amountLkr: dto.amountLkr,
          paymentMethod: dto.paymentMethod,
          serviceDate,
          notes: dto.notes,
          createdById: userId,
          transactionId: transaction.id,
        },
        include: {
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      return job;
    });

    return result;
  }

  async getJobs(query: ServiceJobQueryDto, userRole: string, userStationId: string | null) {
    const where: any = {};

    if (userRole === 'STATION_MANAGER' && userStationId) {
      where.stationId = userStationId;
    } else if (userRole === 'WORKER' && userStationId) {
      where.stationId = userStationId;
    } else if (query.stationId) {
      where.stationId = query.stationId;
    }

    if (query.from || query.to) {
      where.serviceDate = {};
      if (query.from) where.serviceDate.gte = new Date(query.from);
      if (query.to) where.serviceDate.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.serviceJob.findMany({
        where,
        include: {
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { serviceDate: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.serviceJob.count({ where }),
    ]);

    return { items, total };
  }

  async getSummary(stationId: string | undefined, from: string, to: string) {
    const where: any = {
      serviceDate: { gte: new Date(from), lte: new Date(to) },
    };
    if (stationId) where.stationId = stationId;

    const jobs = await this.prisma.serviceJob.findMany({ where });

    const totalRevenue = jobs.reduce((s, j) => s + Number(j.amountLkr), 0);
    const byType: Record<string, { count: number; revenue: number }> = {};

    for (const job of jobs) {
      if (!byType[job.serviceType]) byType[job.serviceType] = { count: 0, revenue: 0 };
      byType[job.serviceType].count++;
      byType[job.serviceType].revenue += Number(job.amountLkr);
    }

    return {
      period: { from, to },
      totalJobs: jobs.length,
      totalRevenue: +totalRevenue.toFixed(2),
      byType: Object.entries(byType).map(([serviceType, vals]) => ({ serviceType, ...vals })),
    };
  }
}
