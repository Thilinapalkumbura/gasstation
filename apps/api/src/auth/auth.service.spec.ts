import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../test/prisma.mock';

jest.mock('bcrypt');

const mockJwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };
const mockConfigService = { get: jest.fn((key: string, def?: any) => def ?? 'test-secret') };

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('signed-token');
  });

  // ── validateUser ──────────────────────────────────────────────────────────

  describe('validateUser', () => {
    const activeUser = {
      id: 'user-1',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'WORKER',
      stationId: 'station-1',
      isActive: true,
      passwordHash: 'hashed-password',
    };

    it('returns user without passwordHash on valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result.id).toBe('user-1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.objectContaining({ id: true, passwordHash: true }),
      });
    });

    it('throws UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('nobody@example.com', 'pass'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when user is deactivated', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(service.validateUser('test@example.com', 'pass'))
        .rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'wrong'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lowercases the email before lookup', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('Test@Example.COM', 'pass')).rejects.toThrow();

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@example.com' } }),
      );
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    const user = { id: 'user-1', email: 'test@example.com', role: 'WORKER', stationId: 'station-1' };

    beforeEach(() => {
      prisma.refreshToken.create.mockResolvedValue({ token: 'refresh-uuid' });
      prisma.auditLog.create.mockResolvedValue({});
    });

    it('returns accessToken and refreshToken', async () => {
      const tokens = await service.login(user);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
    });

    it('signs the access token with JWT payload', async () => {
      await service.login(user);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', email: 'test@example.com', role: 'WORKER' }),
        expect.any(Object),
      );
    });

    it('persists a refresh token record in the database', async () => {
      await service.login(user);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });
  });

  // ── refreshTokens ─────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    const stored = {
      id: 'rt-1',
      token: 'valid-refresh',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 86400000), // tomorrow
      user: { id: 'user-1', email: 'a@b.com', role: 'WORKER', stationId: null, isActive: true },
    };

    beforeEach(() => {
      prisma.refreshToken.findUnique.mockResolvedValue(stored);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({ token: 'new-refresh' });
      prisma.auditLog.create.mockResolvedValue({});
    });

    it('returns new token pair on valid refresh token', async () => {
      const tokens = await service.refreshTokens('user-1', 'valid-refresh');

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
    });

    it('revokes the old token before issuing new ones', async () => {
      await service.refreshTokens('user-1', 'valid-refresh');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' }, data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
      );
    });

    it('throws UnauthorizedException when token not found', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('user-1', 'bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when userId mismatches', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ ...stored, userId: 'different-user' });

      await expect(service.refreshTokens('user-1', 'valid-refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('revokes all tokens and throws on token reuse (revokedAt already set)', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ ...stored, revokedAt: new Date() });
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await expect(service.refreshTokens('user-1', 'valid-refresh')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled(); // all tokens revoked
    });

    it('throws UnauthorizedException when token is expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...stored,
        expiresAt: new Date(Date.now() - 1000), // past
      });

      await expect(service.refreshTokens('user-1', 'valid-refresh')).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when user account is deactivated', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...stored,
        user: { ...stored.user, isActive: false },
      });

      await expect(service.refreshTokens('user-1', 'valid-refresh')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes the given refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.auditLog.create.mockResolvedValue({});

      await service.logout('user-1', 'some-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-token', userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  // ── getProfile ────────────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('returns user profile with station details', async () => {
      const profile = { id: 'user-1', email: 'a@b.com', station: { id: 'station-1', name: 'Main', city: 'Colombo' } };
      prisma.user.findUniqueOrThrow.mockResolvedValue(profile);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(profile);
      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });
  });
});
