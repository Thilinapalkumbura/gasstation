import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.station.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        address: true,
        contactNumber: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.station.findUniqueOrThrow({
      where: { id },
      include: {
        tanks: {
          orderBy: { fuelType: 'asc' },
        },
      },
    });
  }

  async create(data: { name: string; address: string; city: string; contactNumber?: string }) {
    return this.prisma.station.create({ data: { ...data, contactNumber: data.contactNumber ?? '' } });
  }

  async update(id: string, data: Partial<{ name: string; address: string; city: string; contactNumber: string; isActive: boolean }>) {
    return this.prisma.station.update({ where: { id }, data });
  }
}
