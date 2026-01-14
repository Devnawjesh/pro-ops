// src/modules/inventory/controllers/grn.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { GrnService } from '../grn.service';
import { CreateGrnDto } from '../dto/create-grn.dto';
import { UpdateGrnDto } from '../dto/update-grn.dto';
import { ListGrnDto } from '../dto/list-grn.dto';
import { ReceiveGrnDto } from '../dto/receive-grn.dto';
import { PostGrnDto } from '../dto/post-grn.dto';
import { ReportGrnItemsDto } from '../dto/report-grn-items.dto';

@Controller('inventory/grns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GrnController {
  constructor(private readonly service: GrnService) {}

  @Post()
  @Permissions('inv_grn.create')
  create(@Req() req: any, @Body() dto: CreateGrnDto) {
    return this.service.create(req.user, dto);
  }

  @Get()
  @Permissions('inv_grn.list')
  list(@Req() req: any, @Query() q: ListGrnDto) {
    return this.service.list(req.user, q);
  }

  @Get('/lists')
  @Permissions('inv_grn.list')
  report(@Req() req: any, @Query() q: ReportGrnItemsDto) {
    return this.service.reportItems(req.user, q);
  }

  @Get(':id')
  @Permissions('inv_grn.view')
  get(@Req() req: any, @Param('id') id: string) {
    return this.service.get(req.user, id);
  }

  @Patch(':id')
  @Permissions('inv_grn.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateGrnDto) {
    return this.service.update(req.user, id, dto);
  }

  @Delete(':id')
  @Permissions('inv_grn.delete')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user, id);
  }

  @Post(':id/receive')
  @Permissions('inv_grn.receive')
  receive(@Req() req: any, @Param('id') id: string, @Body() dto: ReceiveGrnDto) {
    return this.service.receive(req.user, id, dto);
  }

  @Post(':id/post')
  @Permissions('inv_grn.post')
  post(@Req() req: any, @Param('id') id: string, @Body() dto: PostGrnDto) {
    return this.service.post(req.user, id, dto);
  }
}
