import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { ArService } from './ar.service';
import { ListArInvoiceDto } from './dto/list-ar-invoice.dto';

@Controller('ar/invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ArController {
  constructor(private readonly service: ArService) {}

  @Get()
  @Permissions('ar_invoice.list')
  list(@Req() req: any, @Query() q: ListArInvoiceDto) {
    return this.service.list(req.user, q);
  }

  @Get(':id')
  @Permissions('ar_invoice.view')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.get(req.user, id);
  }
}
