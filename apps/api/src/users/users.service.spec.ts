import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  // ── createUser ────────────────────────────────────────────────────────────

  describe('createUser', () => {
    const dto = {
      email: 'new@example.com',
      password: 'SecurePass@1',
      fullName: 'New User',
      role: 'WORKER' as any,
      stationId: 'station-1',
    };

    it('creates a user and returns it without passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // no duplicate
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ id: 'u-1', email: dto.email, fullName: dto.fullName, role: dto.role });

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('passwordHash');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordHash: 'hashed' }) }),
      );
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('lowercases the email before saving', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.user.create.mockResolvedValue({ id: 'u-1', email: 'new@example.com' });

      await service.create({ ...dto, email: 'New@Example.COM' });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'new@example.com' }) }),
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns a list of all users', async () => {
      const users = [{ id: 'u-1' }, { id: 'u-2' }];
      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns user when found', async () => {
      const user = { id: 'u-1', email: 'a@b.com' };
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne('u-1');

      expect(result).toEqual(user);
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateUser ────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('updates and returns the user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      prisma.user.update.mockResolvedValue({ id: 'u-1', fullName: 'Updated Name' });

      const result = await service.update('u-1', { fullName: 'Updated Name' } as any);

      expect(result.fullName).toBe('Updated Name');
    });

    it('hashes new password if provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      prisma.user.update.mockResolvedValue({ id: 'u-1' });

      await service.update('u-1', { password: 'NewPass@1' } as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass@1', 12);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordHash: 'new-hash' }) }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── deactivate ────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-1', isActive: true });
      prisma.user.update.mockResolvedValue({ id: 'u-1', isActive: false });

      const result = await service.deactivate('u-1');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('throws NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('bad-id')).rejects.toThrow(NotFoundException);
    });
  });
});
