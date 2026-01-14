import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ListCompanyDto } from './dto/list-company.dto';

@Controller('org/companies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  @Post()
  @Permissions('org_company.create')
  create(@Req() req: any, @Body() dto: CreateCompanyDto) {
    return this.service.create(req.user, dto);
  }

  @Get()
  @Permissions('org_company.list')
  list(@Req() req: any, @Query() q: ListCompanyDto) {
    return this.service.list(req.user, q);
  }

  @Get(':id')
  @Permissions('org_company.view')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user, id);
  }

  @Patch(':id')
  @Permissions('org_company.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.service.update(req.user, id, dto);
  }

  @Delete(':id')
  @Permissions('org_company.delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }
}
