import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@gasstation/shared-types';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'usage',
})
export class UsageGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(UsageGateway.name);

  // clientId → { userId, role, stationId }
  private clientMeta = new Map<string, { userId: string; role: string; stationId: string | null }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('UsageGateway initialized — ws://.../usage');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) { client.disconnect(); return; }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      this.clientMeta.set(client.id, {
        userId: payload.sub,
        role: payload.role,
        stationId: payload.stationId,
      });

      // Workers join their own user room (for targeted notifications)
      client.join(`user:${payload.sub}`);

      // Managers join station-manager room
      if (payload.stationId) {
        client.join(`station:${payload.stationId}`);
      }

      // Back-office/admin join global
      if ([UserRole.ADMIN, UserRole.BACK_OFFICE].includes(payload.role)) {
        client.join('global');
      }

      this.logger.log(`UsageGateway: ${client.id} connected | user:${payload.sub} | ${payload.role}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.clientMeta.delete(client.id);
  }

  @SubscribeMessage('subscribe:station')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { stationId: string }) {
    client.join(`station:${data.stationId}`);
    return { event: 'subscribed', data };
  }

  // ── Broadcast: new pending log submitted by worker ────────────────────────
  @OnEvent('usage.submitted')
  handleUsageSubmitted(log: any) {
    const stationId = log.tank?.station?.id;
    const payload = { event: 'usage:submitted', data: log, timestamp: new Date().toISOString() };

    // Notify station managers + back-office
    if (stationId) this.server.to(`station:${stationId}`).emit('usage:submitted', payload);
    this.server.to('global').emit('usage:submitted', payload);

    this.logger.log(`usage:submitted — ${log.shiftType} | tank ${log.tankId} | variance ${log.varianceLitres}L`);
  }

  // ── Broadcast: log approved ────────────────────────────────────────────────
  @OnEvent('usage.approved')
  handleUsageApproved({ log, workerId }: { log: any; workerId: string }) {
    const payload = { event: 'usage:approved', data: log, timestamp: new Date().toISOString() };

    // Notify the worker who submitted
    this.server.to(`user:${workerId}`).emit('usage:approved', payload);

    const stationId = log.tank?.station?.id;
    if (stationId) this.server.to(`station:${stationId}`).emit('usage:approved', payload);
    this.server.to('global').emit('usage:approved', payload);
  }

  // ── Broadcast: log rejected ────────────────────────────────────────────────
  @OnEvent('usage.rejected')
  handleUsageRejected({ log, workerId }: { log: any; workerId: string }) {
    const payload = { event: 'usage:rejected', data: log, timestamp: new Date().toISOString() };

    // Notify the worker
    this.server.to(`user:${workerId}`).emit('usage:rejected', payload);

    const stationId = log.tank?.station?.id;
    if (stationId) this.server.to(`station:${stationId}`).emit('usage:rejected', payload);
  }
}
