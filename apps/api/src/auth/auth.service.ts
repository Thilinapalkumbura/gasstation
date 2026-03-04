import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, AuthTokens } from '@gasstation/shared-types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Validate user credentials (used by LocalStrategy) ─────────────────────
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        stationId: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated. Contact administrator.');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }

  // ── Login — returns access + refresh tokens ────────────────────────────────
  async login(user: { id: string; email: string; role: any; stationId: string | null }): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      stationId: user.stationId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(user.id),
    ]);

    await this.auditLog(user.id, 'USER_LOGIN', user.email);

    return { accessToken, refreshToken };
  }

  // ── Refresh token rotation ─────────────────────────────────────────────────
  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true, role: true, stationId: true, isActive: true } } },
    });

    if (!stored || stored.userId !== userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      // Token reuse detected — revoke all tokens for this user (security measure)
      await this.revokeAllUserTokens(userId);
      this.logger.warn(`Refresh token reuse detected for user ${userId}`);
      throw new UnauthorizedException('Refresh token reused. Please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired. Please log in again.');
    }

    if (!stored.user.isActive) {
      throw new ForbiddenException('Account is deactivated.');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: stored.user.id,
      email: stored.user.email,
      role: stored.user.role as any,
      stationId: stored.user.stationId,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(userId),
    ]);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  // ── Logout — revoke the refresh token ─────────────────────────────────────
  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.auditLog(userId, 'USER_LOGOUT');
  }

  // ── Get current user profile ───────────────────────────────────────────────
  async getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        stationId: true,
        isActive: true,
        createdAt: true,
        station: { select: { id: true, name: true, city: true } },
      },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────
  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<number>('JWT_ACCESS_EXPIRES_IN_SECONDS', 900),
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresInDays = this.config.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS', 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async auditLog(userId: string, action: string, details?: string): Promise<void> {
    await this.prisma.auditLog.create({
      data: { userId, action, entityType: 'User', entityId: userId, newValues: details ? { details } : undefined },
    }).catch(() => {/* non-blocking */});
  }
}
