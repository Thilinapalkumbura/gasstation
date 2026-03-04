import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'stock',
})
export class StockGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(StockGateway.name);

  // clientId → { userId, role, stationId }
  private connectedClients = new Map<string, { userId: string; role: string; stationId: string | null }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('StockGateway initialized — ws://.../stock');
  }

  // ── Connection: validate JWT from handshake ────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      this.connectedClients.set(client.id, {
        userId: payload.sub,
        role: payload.role,
        stationId: payload.stationId,
      });

      // Join station-specific room for targeted broadcasts
      if (payload.stationId) {
        client.join(`station:${payload.stationId}`);
      }
      // Back-office / admin join the global room
      if (['ADMIN', 'BACK_OFFICE'].includes(payload.role)) {
        client.join('global');
      }

      this.logger.log(`Client connected: ${client.id} | user:${payload.sub} | role:${payload.role}`);
      client.emit('connected', { message: 'Connected to stock feed', clientId: client.id });
    } catch {
      this.logger.warn(`Unauthorized WS connection attempt: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Client requests to subscribe to a specific station room ───────────────
  @SubscribeMessage('subscribe:station')
  handleSubscribeStation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { stationId: string },
  ) {
    client.join(`station:${data.stationId}`);
    this.logger.log(`Client ${client.id} subscribed to station:${data.stationId}`);
    return { event: 'subscribed', data: { stationId: data.stationId } };
  }

  @SubscribeMessage('unsubscribe:station')
  handleUnsubscribeStation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { stationId: string },
  ) {
    client.leave(`station:${data.stationId}`);
    return { event: 'unsubscribed', data: { stationId: data.stationId } };
  }

  // ── Internal: broadcast when a tank level changes ─────────────────────────
  @OnEvent('stock.updated')
  handleStockUpdated(tank: any) {
    const payload = {
      event: 'stock:update',
      data: tank,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to station room + global (back-office)
    this.server.to(`station:${tank.stationId}`).emit('stock:update', payload);
    this.server.to('global').emit('stock:update', payload);

    this.logger.debug(`stock:update emitted for tank ${tank.id} — ${tank.fuelType}: ${tank.currentLevelLitres}L`);
  }

  // ── Internal: broadcast low-stock alert ───────────────────────────────────
  @OnEvent('stock.low')
  handleLowStock(tank: any) {
    const payload = {
      event: 'stock:low-alert',
      data: {
        tankId: tank.id,
        stationId: tank.stationId,
        stationName: tank.station?.name,
        fuelType: tank.fuelType,
        currentLevelLitres: tank.currentLevelLitres,
        reorderLevelLitres: tank.reorderLevelLitres,
        percentageFull: tank.percentageFull,
        isCritical: tank.isCritical,
      },
      timestamp: new Date().toISOString(),
    };

    this.server.to(`station:${tank.stationId}`).emit('stock:low-alert', payload);
    this.server.to('global').emit('stock:low-alert', payload);

    this.logger.warn(
      `stock:low-alert — ${tank.fuelType} @ station ${tank.stationId}: ${tank.currentLevelLitres}L`,
    );
  }

  // ── Internal: broadcast spare-parts low-stock alert ──────────────────────
  @OnEvent('spareParts.low')
  handleSparePartsLow(part: any) {
    const payload = {
      event: 'alert:spare-parts-low',
      data: {
        partId: part.partId,
        stationId: part.stationId,
        stationName: part.stationName,
        sku: part.sku,
        name: part.name,
        currentStock: part.currentStock,
        reorderLevel: part.reorderLevel,
        isCritical: part.isCritical,
      },
      timestamp: new Date().toISOString(),
    };

    this.server.to(`station:${part.stationId}`).emit('alert:spare-parts-low', payload);
    this.server.to('global').emit('alert:spare-parts-low', payload);
    this.logger.warn(`alert:spare-parts-low — ${part.name} @ ${part.stationId}: ${part.currentStock} units`);
  }

  // ── Internal: broadcast gas-cylinder low-stock alert ─────────────────────
  @OnEvent('cylinder.low')
  handleCylinderLow(cylinder: any) {
    const payload = {
      event: 'alert:cylinder-low',
      data: {
        cylinderId: cylinder.cylinderId,
        stationId: cylinder.stationId,
        stationName: cylinder.stationName,
        brand: cylinder.brand,
        sizeKg: cylinder.sizeKg,
        fullStock: cylinder.fullStock,
        reorderLevel: cylinder.reorderLevel,
        isCritical: cylinder.isCritical,
      },
      timestamp: new Date().toISOString(),
    };

    this.server.to(`station:${cylinder.stationId}`).emit('alert:cylinder-low', payload);
    this.server.to('global').emit('alert:cylinder-low', payload);
    this.logger.warn(`alert:cylinder-low — ${cylinder.brand} ${cylinder.sizeKg}kg @ ${cylinder.stationId}: ${cylinder.fullStock} units`);
  }

  // ── Utility: push current snapshot to a newly connected client ────────────
  pushSnapshot(clientId: string, tanks: any[]) {
    this.server.to(clientId).emit('stock:snapshot', {
      event: 'stock:snapshot',
      data: tanks,
      timestamp: new Date().toISOString(),
    });
  }

  // ── Stats helper ──────────────────────────────────────────────────────────
  getConnectionCount(): number {
    return this.connectedClients.size;
  }
}
