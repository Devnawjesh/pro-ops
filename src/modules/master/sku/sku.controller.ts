// src/modules/master/sku/sku.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { SkuService } from './sku.service';
import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { ListSkuDto } from './dto/list-sku.dto';

@Controller('master/skus')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SkuController {
  constructor(private readonly service: SkuService) {}

  @Post()
  @Permissions('master:sku:create')
  create(@Req() req: any, @Body() dto: CreateSkuDto) {
    return this.service.create(req.user, dto);
  }

  @Get()
  @Permissions('master:sku:list')
  list(@Req() req: any, @Query() q: ListSkuDto) {
    return this.service.list(req.user, q);
  }

  @Get(':id')
  @Permissions('master:sku:view')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user, id);
  }

  @Patch(':id')
  @Permissions('master:sku:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSkuDto) {
    return this.service.update(req.user, id, dto);
  }

  @Patch(':id/status/:status')
  @Permissions('master:sku:update')
  setStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Param('status') status: string,
    @Body() body: { reason?: string | null },
  ) {
    return this.service.setStatus(req.user, id, Number(status), body?.reason ?? null);
  }

  @Delete(':id')
  @Permissions('master:sku:delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.softDelete(req.user, id);
  }
}
