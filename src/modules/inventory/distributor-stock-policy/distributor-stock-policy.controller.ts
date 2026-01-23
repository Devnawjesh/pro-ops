import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { DistributorStockPolicyService } from './distributor-stock-policy.service';
import { CreateDistributorStockPolicyDto } from './dto/create-distributor-stock-policy.dto';
import { UpdateDistributorStockPolicyDto } from './dto/update-distributor-stock-policy.dto';
import { ListDistributorStockPolicyDto } from './dto/list-distributor-stock-policy.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('/distributor-stock-policies')
export class DistributorStockPolicyController {
  constructor(private readonly service: DistributorStockPolicyService) {}

  @Post()
  @Permissions('inv_distributor_stock_policy.create')
  async create(@Req() req: any,@Body() dto: CreateDistributorStockPolicyDto) {
    // If you have req.user, you can pass actor id to service:
    return this.service.create(dto, req.user?.id);
    //return this.service.create(dto);
  }

  @Get()
  @Permissions('inv_distributor_stock_policy.list')
  async list(@Query() dto: ListDistributorStockPolicyDto) {
    return this.service.list(dto);
  }

  @Get(':id')
  @Permissions('inv_distributor_stock_policy.view')
  async get(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Patch(':id')
  @Permissions('inv_distributor_stock_policy.update')
  async update(@Param('id') id: string, @Body() dto: UpdateDistributorStockPolicyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('inv_distributor_stock_policy.delete')
  async remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
