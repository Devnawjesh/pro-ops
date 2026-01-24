import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { OrdersService } from './orders.service';
import { ReportSalesDailySkuDto, ReportSalesDto } from './dto/report-sales.dto';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales/reports')
export class SalesReportsController {
  constructor(private readonly orders: OrdersService) {}

  @Get('distributor-totals')
  @Permissions('sales_orders:list')
  distributorTotals(@Req() req: any, @Query() q: ReportSalesDto) {
    return this.orders.reportDistributorTotals(req.user, q);
  }

  @Get('outlet-totals')
  @Permissions('sales_orders:list')
  outletTotals(@Req() req: any, @Query() q: ReportSalesDto) {
    return this.orders.reportOutletTotals(req.user, q);
  }

  @Get('sku-daily')
  @Permissions('sales_orders:list')
  skuDaily(@Req() req: any, @Query() q: ReportSalesDailySkuDto) {
    return this.orders.reportSkuDaily(req.user, q);
  }
}
