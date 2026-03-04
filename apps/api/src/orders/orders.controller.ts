import {
  Controller, Get, Post, Patch, Param, Body,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateGRNDto } from './dto/create-grn.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, JwtPayload } from '@gasstation/shared-types';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Suppliers ─────────────────────────────────────────────────────────────

  @Post('suppliers')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'Create a new supplier' })
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.ordersService.createSupplier(dto);
  }

  @Get('suppliers')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'List suppliers, optionally scoped to a station' })
  @ApiQuery({ name: 'stationId', required: false })
  getSuppliers(@Query('stationId') stationId?: string) {
    return this.ordersService.getSuppliers(stationId);
  }

  @Post('suppliers/:supplierId/link/:stationId')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE)
  @ApiOperation({ summary: 'Link a supplier to a station' })
  @ApiQuery({ name: 'preferred', required: false })
  linkSupplier(
    @Param('supplierId') supplierId: string,
    @Param('stationId') stationId: string,
    @Query('preferred') preferred?: string,
  ) {
    return this.ordersService.linkSupplierToStation(stationId, supplierId, preferred === 'true');
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Create a draft purchase order' })
  createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: JwtPayload) {
    return this.ordersService.createOrder(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'List purchase orders (scoped by role)' })
  getOrders(@Query() query: OrderQueryDto, @CurrentUser() user: JwtPayload) {
    return this.ordersService.getOrders(query, user.role, user.stationId);
  }

  @Get('summary')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Order count and value summary by status' })
  @ApiQuery({ name: 'stationId', required: false })
  getSummary(@Query('stationId') stationId?: string, @CurrentUser() user?: JwtPayload) {
    const scopedStation =
      user?.role === UserRole.STATION_MANAGER ? user.stationId ?? undefined : stationId;
    return this.ordersService.getOrderSummary(scopedStation);
  }

  @Get('reorder-suggestions')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Tanks below reorder level that need a purchase order' })
  getReorderSuggestions() {
    return this.ordersService.getReorderSuggestions();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Get purchase order with items and GRNs' })
  getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @Patch(':id/submit')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Submit a draft order for approval' })
  submitOrder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.submitOrder(id, user.sub);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Approve a submitted order' })
  approveOrder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.ordersService.approveOrder(id, user.sub);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Cancel a purchase order' })
  cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.ordersService.cancelOrder(id, user.sub, dto);
  }

  // ── GRN ───────────────────────────────────────────────────────────────────

  @Post('grn')
  @Roles(UserRole.ADMIN, UserRole.BACK_OFFICE, UserRole.STATION_MANAGER)
  @ApiOperation({ summary: 'Record a goods received note — triggers DELIVERY_IN stock movement' })
  createGRN(@Body() dto: CreateGRNDto, @CurrentUser() user: JwtPayload) {
    return this.ordersService.createGRN(dto, user.sub);
  }
}
