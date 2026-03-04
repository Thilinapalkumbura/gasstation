/**
 * Database Seed — Development data for Gasstation system
 * Includes: admin user, sample station, tanks with all fuel types, tax rates
 */

import { PrismaClient, UserRole, FuelType, TaxType, CylinderBrand } from './generated/prisma/index';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Tax Rates (Sri Lanka IRD current rates) ──────────────────────────────
  console.log('  → Seeding tax rates...');
  const taxRates = [
    {
      taxType: TaxType.VAT,
      ratePercent: 18.0,
      effectiveFrom: new Date('2024-01-01'),
      description: 'VAT 18% — effective Jan 2024 per IRD amendment',
    },
    {
      taxType: TaxType.WHT,
      ratePercent: 5.0,
      effectiveFrom: new Date('2024-01-01'),
      description: 'WHT 5% on service/supplier payments to companies',
    },
    {
      taxType: TaxType.INCOME_TAX,
      ratePercent: 30.0,
      effectiveFrom: new Date('2024-04-01'),
      description: 'Corporate income tax 30% on taxable profit — SL fiscal year 2024/25',
    },
    {
      taxType: TaxType.ESC,
      ratePercent: 0.25,
      effectiveFrom: new Date('2024-01-01'),
      description: 'ESC 0.25% on turnover > LKR 250M',
    },
    {
      taxType: TaxType.PAYE,
      ratePercent: 18.0,
      effectiveFrom: new Date('2024-01-01'),
      description: 'PAYE — progressive rate, 18% indicative for seed (actual bands apply)',
    },
  ];

  for (const rate of taxRates) {
    await prisma.taxRate.upsert({
      where: {
        id: `${rate.taxType}-${rate.effectiveFrom.toISOString().slice(0, 10)}`,
      },
      update: {},
      create: { id: `${rate.taxType}-${rate.effectiveFrom.toISOString().slice(0, 10)}`, ...rate },
    });
  }

  // ── Admin User ────────────────────────────────────────────────────────────
  console.log('  → Seeding admin user...');
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gasstation.lk' },
    update: {},
    create: {
      email: 'admin@gasstation.lk',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // ── Back Office User ──────────────────────────────────────────────────────
  const backOfficePassword = await bcrypt.hash('BackOffice@123', 12);
  const backOfficeUser = await prisma.user.upsert({
    where: { email: 'backoffice@gasstation.lk' },
    update: {},
    create: {
      email: 'backoffice@gasstation.lk',
      passwordHash: backOfficePassword,
      fullName: 'Back Office Manager',
      role: UserRole.BACK_OFFICE,
      isActive: true,
    },
  });

  // ── Sample Station ────────────────────────────────────────────────────────
  console.log('  → Seeding sample station...');
  const station = await prisma.station.upsert({
    where: { id: 'station-001' },
    update: {},
    create: {
      id: 'station-001',
      name: 'Colombo Main Station',
      address: '123, Galle Road',
      city: 'Colombo 03',
      contactNumber: '+94 11 234 5678',
      isActive: true,
    },
  });

  // ── Station Manager ───────────────────────────────────────────────────────
  const managerPassword = await bcrypt.hash('Manager@123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@station001.lk' },
    update: {},
    create: {
      email: 'manager@station001.lk',
      passwordHash: managerPassword,
      fullName: 'Station Manager - Colombo',
      role: UserRole.STATION_MANAGER,
      stationId: station.id,
      isActive: true,
    },
  });

  // ── Worker User ───────────────────────────────────────────────────────────
  const workerPassword = await bcrypt.hash('Worker@123', 12);
  await prisma.user.upsert({
    where: { email: 'worker1@station001.lk' },
    update: {},
    create: {
      email: 'worker1@station001.lk',
      passwordHash: workerPassword,
      fullName: 'Worker - Kamal Perera',
      role: UserRole.WORKER,
      stationId: station.id,
      isActive: true,
    },
  });

  // ── Tanks ─────────────────────────────────────────────────────────────────
  console.log('  → Seeding tanks...');
  const tankData = [
    {
      fuelType: FuelType.PETROL_92,
      capacityLitres: 30000,
      currentLevelLitres: 18000,
      reorderLevelLitres: 8000,
      reorderQtyLitres: 20000,
    },
    {
      fuelType: FuelType.PETROL_95,
      capacityLitres: 20000,
      currentLevelLitres: 12000,
      reorderLevelLitres: 5000,
      reorderQtyLitres: 15000,
    },
    {
      fuelType: FuelType.AUTO_DIESEL,
      capacityLitres: 40000,
      currentLevelLitres: 25000,
      reorderLevelLitres: 10000,
      reorderQtyLitres: 30000,
    },
    {
      fuelType: FuelType.SUPER_DIESEL,
      capacityLitres: 15000,
      currentLevelLitres: 9000,
      reorderLevelLitres: 4000,
      reorderQtyLitres: 10000,
    },
    {
      fuelType: FuelType.KEROSENE,
      capacityLitres: 10000,
      currentLevelLitres: 6000,
      reorderLevelLitres: 2000,
      reorderQtyLitres: 8000,
    },
  ];

  for (const tank of tankData) {
    await prisma.tank.upsert({
      where: { stationId_fuelType: { stationId: station.id, fuelType: tank.fuelType } },
      update: {},
      create: { stationId: station.id, ...tank },
    });
  }

  // ── Sample Supplier (CPC) ─────────────────────────────────────────────────
  console.log('  → Seeding supplier...');
  const supplier = await prisma.supplier.upsert({
    where: { id: 'supplier-cpc' },
    update: {},
    create: {
      id: 'supplier-cpc',
      name: 'Ceylon Petroleum Corporation (CPC)',
      registrationNo: 'PQ/0001',
      vatRegNo: 'VAT-CPC-001',
      address: 'CPC House, 609, Dr. Danister De Silva Mawatha, Colombo 9',
      contactPerson: 'Supply Manager',
      contactNumber: '+94 11 244 5000',
      email: 'supply@ceypetco.gov.lk',
      isActive: true,
    },
  });

  await prisma.stationSupplier.upsert({
    where: { stationId_supplierId: { stationId: station.id, supplierId: supplier.id } },
    update: {},
    create: { stationId: station.id, supplierId: supplier.id, isPreferred: true },
  });

  // ── Gas Cylinders ─────────────────────────────────────────────────────────
  console.log('  → Seeding gas cylinders...');
  const cylinderData = [
    { brand: CylinderBrand.LAUGFS, sizeKg: 2.3,  sellingPriceLkr: 850,   purchasePriceLkr: 700,  fullStock: 30, emptyStock: 5,  reorderLevel: 10 },
    { brand: CylinderBrand.LAUGFS, sizeKg: 5,    sellingPriceLkr: 1800,  purchasePriceLkr: 1500, fullStock: 20, emptyStock: 3,  reorderLevel: 8  },
    { brand: CylinderBrand.LAUGFS, sizeKg: 12.5, sellingPriceLkr: 4200,  purchasePriceLkr: 3500, fullStock: 15, emptyStock: 2,  reorderLevel: 5  },
    { brand: CylinderBrand.SHELL,  sizeKg: 5,    sellingPriceLkr: 1900,  purchasePriceLkr: 1580, fullStock: 10, emptyStock: 1,  reorderLevel: 5  },
    { brand: CylinderBrand.SHELL,  sizeKg: 12.5, sellingPriceLkr: 4350,  purchasePriceLkr: 3600, fullStock: 8,  emptyStock: 0,  reorderLevel: 3  },
  ];

  for (const cyl of cylinderData) {
    await prisma.gasCylinder.upsert({
      where: { stationId_brand_sizeKg: { stationId: station.id, brand: cyl.brand, sizeKg: cyl.sizeKg } },
      update: {},
      create: { stationId: station.id, ...cyl },
    });
  }

  // ── Spare Parts ───────────────────────────────────────────────────────────
  console.log('  → Seeding spare parts...');
  const sparePartsData = [
    { sku: 'OIL-FILTER-001', name: 'Oil Filter — Toyota',      brand: 'Denso',  category: 'Filters',  unitPriceLkr: 1200, costPriceLkr: 850,  currentStock: 25, reorderLevel: 5  },
    { sku: 'OIL-FILTER-002', name: 'Oil Filter — Nissan',      brand: 'Bosch',  category: 'Filters',  unitPriceLkr: 1100, costPriceLkr: 780,  currentStock: 20, reorderLevel: 5  },
    { sku: 'AIR-FILTER-001', name: 'Air Filter — Universal',   brand: 'K&N',    category: 'Filters',  unitPriceLkr: 2400, costPriceLkr: 1800, currentStock: 15, reorderLevel: 3  },
    { sku: 'WIPER-001',      name: 'Wiper Blade 18"',          brand: 'Bosch',  category: 'Wipers',   unitPriceLkr: 750,  costPriceLkr: 500,  currentStock: 30, reorderLevel: 10 },
    { sku: 'WIPER-002',      name: 'Wiper Blade 20"',          brand: 'Bosch',  category: 'Wipers',   unitPriceLkr: 850,  costPriceLkr: 580,  currentStock: 30, reorderLevel: 10 },
    { sku: 'ENG-OIL-001',    name: 'Engine Oil 5W-30 (1L)',    brand: 'Castrol',category: 'Lubricants',unitPriceLkr: 2200, costPriceLkr: 1700, currentStock: 50, reorderLevel: 15 },
    { sku: 'ENG-OIL-002',    name: 'Engine Oil 10W-40 (1L)',   brand: 'Mobil',  category: 'Lubricants',unitPriceLkr: 1950, costPriceLkr: 1500, currentStock: 40, reorderLevel: 15 },
    { sku: 'COOLANT-001',    name: 'Radiator Coolant (1L)',    brand: 'Prestone',category: 'Fluids',  unitPriceLkr: 1400, costPriceLkr: 1000, currentStock: 20, reorderLevel: 5  },
    { sku: 'BRAKE-PAD-001',  name: 'Brake Pad Set — Front',    brand: 'Brembo', category: 'Brakes',   unitPriceLkr: 5500, costPriceLkr: 4000, currentStock: 8,  reorderLevel: 2  },
    { sku: 'BATTERY-001',    name: 'Car Battery 40Ah',         brand: 'Amaron', category: 'Electrical',unitPriceLkr: 18500,costPriceLkr: 14000,currentStock: 5,  reorderLevel: 2  },
  ];

  for (const part of sparePartsData) {
    await prisma.sparePart.upsert({
      where: { stationId_sku: { stationId: station.id, sku: part.sku } },
      update: {},
      create: { stationId: station.id, ...part },
    });
  }

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Default credentials:');
  console.log('  Admin         : admin@gasstation.lk       / Admin@123');
  console.log('  Back Office   : backoffice@gasstation.lk  / BackOffice@123');
  console.log('  Sta. Manager  : manager@station001.lk     / Manager@123');
  console.log('  Worker        : worker1@station001.lk     / Worker@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
