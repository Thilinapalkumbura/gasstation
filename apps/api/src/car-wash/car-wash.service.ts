import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCarWashJobDto } from './dto/create-car-wash-job.dto';
import { CarWashJobQueryDto } from './dto/car-wash-job-query.dto';
import { TransactionCategory } from '@gasstation/shared-types';

@Injectable()
export class CarWashService {
  constructor(private readonly prisma: PrismaService) {}

  private getFiscalPeriod(date: Date) {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const fiscalMonth = month >= 4 ? month - 3 : month + 9;
    const fiscalYear = month >= 4 ? year : year - 1;
    return { year: fiscalYear, month: fiscalMonth };
  }

  async createJob(dto: CreateCarWashJobDto, userId: string) {
    const station = await this.prisma.station.findUnique({ where: { id: dto.stationId } });
    if (!station) throw new NotFoundException('Station not found');

    const washDate = new Date(dto.washDate);
    const fiscal = this.getFiscalPeriod(washDate);

    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          stationId: dto.stationId,
          category: TransactionCategory.CAR_WASH_SALE,
          description: `Car wash — ${dto.washType} for ${dto.vehicleNumber}`,
          amountLkr: dto.amountLkr,
          vatAmountLkr: 0,
          netAmountLkr: dto.amountLkr,
          paymentMethod: dto.paymentMethod,
          transactionDate: washDate,
          fiscalYear: fiscal.year,
          fiscalMonth: fiscal.month,
          createdById: userId,
        },
      });

      const job = await tx.carWashJob.create({
        data: {
          stationId: dto.stationId,
          vehicleNumber: dto.vehicleNumber,
          washType: dto.washType,
          amountLkr: dto.amountLkr,
          paymentMethod: dto.paymentMethod,
          washDate,
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

  async getJobs(query: CarWashJobQueryDto, userRole: string, userStationId: string | null) {
    const where: any = {};

    if (userRole === 'STATION_MANAGER' && userStationId) {
      where.stationId = userStationId;
    } else if (userRole === 'WORKER' && userStationId) {
      where.stationId = userStationId;
    } else if (query.stationId) {
      where.stationId = query.stationId;
    }

    if (query.from || query.to) {
      where.washDate = {};
      if (query.from) where.washDate.gte = new Date(query.from);
      if (query.to) where.washDate.lte = new Date(query.to);
    }

    const [items, total] = await Promise.all([
      this.prisma.carWashJob.findMany({
        where,
        include: {
          station: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: { washDate: 'desc' },
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
      }),
      this.prisma.carWashJob.count({ where }),
    ]);

    return { items, total };
  }

  async getSummary(stationId: string | undefined, from: string, to: string) {
    const where: any = {
      washDate: { gte: new Date(from), lte: new Date(to) },
    };
    if (stationId) where.stationId = stationId;

    const jobs = await this.prisma.carWashJob.findMany({ where });

    const totalRevenue = jobs.reduce((s, j) => s + Number(j.amountLkr), 0);
    const byType: Record<string, { count: number; revenue: number }> = {};

    for (const job of jobs) {
      if (!byType[job.washType]) byType[job.washType] = { count: 0, revenue: 0 };
      byType[job.washType].count++;
      byType[job.washType].revenue += Number(job.amountLkr);
    }

    return {
      period: { from, to },
      totalJobs: jobs.length,
      totalRevenue: +totalRevenue.toFixed(2),
      byType: Object.entries(byType).map(([washType, vals]) => ({ washType, ...vals })),
    };
  }
}
