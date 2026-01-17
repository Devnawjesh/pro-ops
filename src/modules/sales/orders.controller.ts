import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrderDto } from './dto/list-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';

@Controller('sales/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  // Create draft
  @Post()
  create(@Req() req: any, @Body() dto: CreateOrderDto) {
    return this.service.createDraft(req.user, dto);
  }

  // Update draft (only DRAFT)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.service.updateDraft(req.user, id, dto);
  }

  // Submit (DRAFT -> SUBMITTED)
  @Post(':id/submit')
  submit(@Req() req: any, @Param('id') id: string) {
    return this.service.submit(req.user, id);
  }

  // Approve (SUBMITTED -> APPROVED + reserve stock)
  @Post(':id/approve')
  approve(@Req() req: any, @Param('id') id: string) {
    return this.service.approve(req.user, id);
  }

  // Reject (SUBMITTED -> REJECTED)
  @Post(':id/reject')
  reject(@Req() req: any, @Param('id') id: string, @Body() dto: RejectOrderDto) {
    return this.service.reject(req.user, id, dto);
  }

  // Details
  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.getOne(req.user, id);
  }

  // List (admin + hierarchy scoped)
  @Get()
  list(@Req() req: any, @Query() q: ListOrderDto) {
    return this.service.list(req.user, q);
  }
}
