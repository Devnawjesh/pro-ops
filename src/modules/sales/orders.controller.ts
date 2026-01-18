import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrderDto } from './dto/list-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  // Create draft/submit new order
  @Post()
  @Permissions('sales_orders:create')
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.service.createDraft(req.user, dto);
  }

  // Update draft (only DRAFT)
  @Patch(':id')
  @Permissions('sales_orders:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.updateDraft(req.user, id, dto);
  }

  // Submit (DRAFT -> SUBMITTED)
  @Post(':id/submit')
  @Permissions('sales_orders:submit')
  submit(@Req() req: any, @Param('id') id: string) {
    return this.service.submit(req.user, id);
  }

  // Approve (SUBMITTED -> APPROVED + reserve stock)
  @Post(':id/approve')
  @Permissions('sales_orders:approve')
  approve(@Req() req: any, @Param('id') id: string) {
    return this.service.approve(req.user, id);
  }

  // Reject (SUBMITTED -> REJECTED)
  @Post(':id/reject')
  @Permissions('sales_orders:reject')
  reject(@Req() req: any, @Param('id') id: string, @Body() dto: RejectOrderDto) {
    return this.service.reject(req.user, id, dto);
  }

  // Details
  @Get(':id')
  @Permissions('sales_orders:view')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.getOne(req.user, id);
  }

  // List (admin + hierarchy scoped)
  @Get()
  @Permissions('sales_orders:list')
  list(@Req() req: any, @Query() q: ListOrderDto) {
    return this.service.list(req.user, q);
  }

  @Get('pending-approvals')
  @Permissions('sales_orders:approve')
    pendingApprovals(@Req() req: any, @Query() q: ListOrderDto) {
    return this.service.listPendingApprovals(req.user, q);
  }

}
