// src/modules/inventory/controllers/transfer.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { TransferService } from '../transfer.service';
import { CreateTransferDto } from '../dto/transfer/create-transfer.dto';
import { ListTransferDto } from '../dto/transfer/list-transfer.dto';
import { ReceiveTransferDto } from '../dto/transfer/receive-transfer.dto';

/**
 * User friendly transfer module:
 * - Admin creates transfer => system immediately dispatches (no DRAFT, no update)
 * - Distributor user sees incoming transfers
 * - Distributor receives partial/full
 *
 * Suggested permissions:
 * - inv_transfer.create      (admin/internal)
 * - inv_transfer.list        (admin/internal list)
 * - inv_transfer.incoming    (distributor list incoming)
 * - inv_transfer.view        (details)
 * - inv_transfer.receive     (distributor receive)
 */
@Controller('inventory/transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransferController {
  constructor(private readonly service: TransferService) {}

  /**
   * Admin/Internal: Create + Dispatch in one call.
   * No draft workflow.
   */
  @Post()
  @Permissions('inv_transfer.create')
  createAndDispatch(@Req() req: any, @Body() dto: CreateTransferDto) {
    return this.service.createAndDispatch(req.user, dto);
  }

  /**
   * Admin/Internal: list all transfers (with filters/pagination).
   * Distributor users can also hit this (service will restrict by their warehouse ids if needed),
   * but for best UX use /incoming.
   */
  @Get()
  @Permissions('inv_transfer.list')
  list(@Req() req: any, @Query() q: ListTransferDto) {
    return this.service.list(req.user, q);
  }

  /**
   * Distributor: list incoming transfers targeted to their warehouse(s).
   * Only DISPATCHED / PARTIAL will be shown.
   */
  @Get('incoming')
  @Permissions('inv_transfer.incoming')
  incoming(@Req() req: any, @Query() q: ListTransferDto) {
    return this.service.listIncoming(req.user, q);
  }

  /**
   * View transfer header + lines (should include sku_code/sku_name in service).
   */
  @Get(':id')
  @Permissions('inv_transfer.view')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.get(req.user, id);
  }

  /**
   * Distributor: receive partial or full.
   * (Service enforces: received_total <= dispatched_total)
   */
  @Post(':id/receive')
  @Permissions('inv_transfer.receive')
  receive(@Req() req: any, @Param('id') id: string, @Body() dto: ReceiveTransferDto) {
    return this.service.receive(req.user, id, dto);
  }
}
