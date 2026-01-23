// src/modules/inventory/controllers/stock.controller.ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { StockService } from '../stock.service';
import { ListStockDto } from '../dto/stock/list-stock.dto';
import { ListLotDto } from '../dto/stock/list-lot.dto';
import { ListStockAlertsDto } from '../dto/stock/ListStockAlertsDto.dto';

@Controller('inventory/stocks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly service: StockService) {}
  @Get('/alerts')
  @Permissions('inv_stock.alerts.list')
  listAlerts(@Req() req: any, @Query() dto: ListStockAlertsDto) {
    return this.service.listAlerts(req.user, dto);
  }
  @Get()
  @Permissions('inv_stock.list')
  list(@Req() req: any, @Query() q: ListStockDto) {
    return this.service.list(req.user, q);
  }
   @Get('lots')
  @Permissions('inv_stock.lots')
  lots(@Req() req: any, @Query() q: ListLotDto) {
    return this.service.listLots(req.user, q);
  }

}
