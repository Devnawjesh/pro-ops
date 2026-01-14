import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { OrgHierarchyService } from './org-hierarchy.service';
import { CreateOrgNodeDto } from './dto/create-org-node.dto';
import { UpdateOrgNodeDto } from './dto/update-org-node.dto';
import { ListOrgNodeDto } from './dto/list-org-node.dto';
import { BulkImportOrgDto } from './dto/bulk-import-org.dto';
import { OrgTreeQueryDto } from './dto/tree-org.dto';

@Controller('org/nodes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrgHierarchyController {
  constructor(private readonly service: OrgHierarchyService) {}

  @Post()
  @Permissions('org_node.create')
  create(@Req() req: any, @Body() dto: CreateOrgNodeDto) {
    return this.service.create(req.user, dto);
  }
@Post('bulk-import')
@Permissions('org_node.bulk_import')
bulkImport(@Req() req: any, @Body() dto: BulkImportOrgDto) {
  return this.service.bulkImport(req.user, dto);
}
  @Get()
  @Permissions('org_node.list')
  list(@Req() req: any, @Query() q: ListOrgNodeDto) {
    return this.service.list(req.user, q);
  }
@Get('tree')
@Permissions('org_node.tree')
tree(@Req() req: any, @Query() q: OrgTreeQueryDto) {
  return this.service.getTree(req.user, q);
}
  @Get(':id')
  @Permissions('org_node.view')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user, id);
  }
  @Get(':id/routes')
@Permissions('org_node.subordinate_routes')
subordinateRoutes(@Req() req: any, @Param('id') id: string) {
  return this.service.getSubordinateRoutes(req.user, id);
}

  @Patch(':id')
  @Permissions('org_node.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrgNodeDto) {
    return this.service.update(req.user, id, dto);
  }

  @Delete(':id')
  @Permissions('org_node.delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }
}
