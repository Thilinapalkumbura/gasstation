/**
 * Shared Prisma mock factory.
 * Returns a deeply mocked PrismaService with jest.fn() on every model method.
 * Import this in any spec file instead of the real PrismaService.
 */

export type DeepMockProxy<T> = {
  [K in keyof T]: T[K] extends object ? DeepMockProxy<T[K]> : jest.Mock;
};

function mockDeep<T>(obj?: Partial<T>): DeepMockProxy<T> {
  return new Proxy(obj ?? {}, {
    get(target: any, prop: string) {
      if (prop in target) return target[prop];
      // Auto-create jest.fn() for any property access
      const fn = jest.fn();
      target[prop] = fn;
      return fn;
    },
  }) as any;
}

/** Creates a full PrismaService mock with nested model mocks. */
export function createPrismaMock() {
  const models = [
    'user', 'station', 'tank', 'stockMovement', 'refreshToken', 'auditLog',
    'dailyUsageLog', 'purchaseOrder', 'purchaseOrderItem', 'supplier', 'stationSupplier',
    'goodsReceiptNote', 'grnItem', 'taxRate', 'taxEntry', 'transaction',
    'carWashJob', 'serviceJob', 'sparePart', 'sparePartSale', 'sparePartSaleItem',
    'sparePartStockIn', 'gasCylinder', 'cylinderSale', 'cylinderStockIn',
  ];

  const mock: any = {
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    tank: { fields: { reorderLevelLitres: {} } },
  };

  for (const model of models) {
    mock[model] = {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    };
  }

  return mock;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;
