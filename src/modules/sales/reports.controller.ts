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
  @Permissions('sales_reports:distributor_totals')
  distributorTotals(@Req() req: any, @Query() q: ReportSalesDto) {
    return this.orders.reportDistributorTotals(req.user, q);
  }

  @Get('outlet-totals')
  @Permissions('sales_reports:outlet_totals')
  outletTotals(@Req() req: any, @Query() q: ReportSalesDto) {
    return this.orders.reportOutletTotals(req.user, q);
  }

  @Get('sku-daily')
  @Permissions('sales_reports:sku_daily')
  skuDaily(@Req() req: any, @Query() q: ReportSalesDailySkuDto) {
    return this.orders.reportSkuDaily(req.user, q);
  }
}
