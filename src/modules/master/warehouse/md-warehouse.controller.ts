// src/modules/master/warehouse/md-warehouse.controller.ts
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

import { MdWarehouseService } from './md-warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ListWarehouseDto } from './dto/list-warehouse.dto';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('master/warehouses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MdWarehouseController {
  constructor(private readonly service: MdWarehouseService) {}

  @Post()
  @Permissions('md_warehouse.create')
  async create(@Req() req: any, @Body() dto: CreateWarehouseDto) {
    const data = await this.service.create(
      { user_id: req.user.user_id, company_id: req.user.company_id },
      dto,
    );
    return data;
  }

  @Get()
  @Permissions('md_warehouse.list')
  async list(@Req() req: any, @Query() q: ListWarehouseDto) {
    const data = await this.service.list(
      { user_id: req.user.user_id, company_id: req.user.company_id },
      q,
    );
    return data;
  }

  @Get(':id')
  @Permissions('md_warehouse.view')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.service.findOne(
      { user_id: req.user.user_id, company_id: req.user.company_id },
      id,
    );
    return data;
  }

  @Patch(':id')
  @Permissions('md_warehouse.update')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    const data = await this.service.update(
      { user_id: req.user.user_id, company_id: req.user.company_id },
      id,
      dto,
    );
    return data;
  }
@Patch(':id/make-default')
  @Permissions('md_warehouse.update')
  async makeDefault(@Req() req: any, @Param('id') id: string) {
    const auth = { user_id: req.user.user_id, company_id: req.user.company_id };
    const data = await this.service.makeDefault(auth, id);
    return data;
  }
  @Delete(':id')
  @Permissions('md_warehouse.delete')
  async remove(@Req() req: any, @Param('id') id: string) {
    const data = await this.service.remove(
      { user_id: req.user.user_id, company_id: req.user.company_id },
      id,
    );
    return data;
  }
}
