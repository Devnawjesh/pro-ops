// src/modules/master/distributor/distributor.controller.ts
import {
  Body,
  Controller,
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

import { DistributorService } from './distributor.service';
import { CreateDistributorDto } from './dto/create-distributor.dto';
import { UpdateDistributorDto } from './dto/update-distributor.dto';
import { ListDistributorDto } from './dto/list-distributor.dto';

@Controller('master/distributors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DistributorController {
  constructor(private readonly service: DistributorService) {}

  @Post()
  @Permissions('md_distributor.create')
  async create(@Req() req: any, @Body() dto: CreateDistributorDto) {
    return this.service.create(req.user, dto);
  }

  @Get()
  @Permissions('md_distributor.list')
  async list(@Req() req: any, @Query() q: ListDistributorDto) {
    return this.service.list(req.user, q);
  }
  @Get('visible')
  @Permissions('md_distributor.list')
  async visible(@Req() req: any, @Query() q: ListDistributorDto) {
    return this.service.listVisibleDistributors(req.user, q);
  }
  @Get(':id')
  @Permissions('md_distributor.view')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user, id);
  }

  @Patch(':id')
  @Permissions('md_distributor.update')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDistributorDto,
  ) {
    return this.service.update(req.user, id, dto);
  }

  @Patch(':id/inactivate')
  @Permissions('md_distributor.update')
  async inactivate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.service.inactivate(req.user, id, body?.reason);
  }

  @Patch(':id/activate')
  @Permissions('md_distributor.update')
  async activate(@Req() req: any, @Param('id') id: string) {
    return this.service.activate(req.user, id);
  }


}
