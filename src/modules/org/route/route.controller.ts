import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { RouteService } from './route.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { ListRouteDto } from './dto/list-route.dto';
import { RoutesByWeekdayDto } from './dto/routes-by-weekday.dto';

@Controller('org/routes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RouteController {
  constructor(private readonly service: RouteService) {}

  @Post()
  @Permissions('org_route.create')
  create(@Req() req: any, @Body() dto: CreateRouteDto) {
    return this.service.create(req.user, dto);
  }

  @Get()
  @Permissions('org_route.list')
  list(@Req() req: any, @Query() q: ListRouteDto) {
    return this.service.list(req.user, q);
  }

  @Get(':id')
  @Permissions('org_route.view')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user, id);
  }
@Get('by-weekday')
@Permissions('org_route.plan')
byWeekday(@Req() req: any, @Query() q: RoutesByWeekdayDto) {
  return this.service.listByWeekday(req.user, q.day);
}

  @Patch(':id')
  @Permissions('org_route.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.service.update(req.user, id, dto);
  }

  @Delete(':id')
  @Permissions('org_route.delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }
}
