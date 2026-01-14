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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';

import { OutletService } from './outlet.service';
import {
  BulkCreateOutletDto,
  BulkMapOutletDistributorDto,
  BulkMapOutletOrgDto,
  CreateOutletDto,
  ListOutletDto,
  MapOutletDistributorDto,
  MapOutletOrgDto,
  UpdateOutletDto,
} from './dto/outlet.dto';

import {
  BulkMapOutletDistributorByCodeDto,
  BulkMapOutletOrgByCodeDto,
  MapOutletDistributorByCodeDto,
  MapOutletOrgByCodeDto,
} from './dto/outlet-mapping-by-code.dto';

@Controller('outlets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OutletController {
  constructor(private readonly service: OutletService) {}

  @Post()
  @Permissions('md_outlet.create')
  create(@Req() req: any, @Body() dto: CreateOutletDto) {
    return this.service.create(req.user, dto);
  }

  @Post('bulk')
  @Permissions('md_outlet.bulk_import')
  bulkCreate(@Req() req: any, @Body() dto: BulkCreateOutletDto) {
    return this.service.bulkCreate(req.user, dto);
  }

  @Post('bulk-excel')
  @Permissions('md_outlet.bulk_import')
  @UseInterceptors(FileInterceptor('file'))
  bulkCreateExcel(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.service.bulkCreateFromExcel(req.user, file);
  }

  @Get()
  @Permissions('md_outlet.list')
  list(@Req() req: any, @Query() q: ListOutletDto) {
    return this.service.list(req.user, q);
  }

  @Get(':id')
  @Permissions('md_outlet.view')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user, id);
  }

  @Patch(':id')
  @Permissions('md_outlet.update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOutletDto) {
    return this.service.update(req.user, id, dto);
  }

  @Delete(':id')
  @Permissions('md_outlet.delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user, id);
  }

  @Post('outlets/import-excel')
    @UseInterceptors(FileInterceptor('file'))
    async importExcel(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
        return this.service.bulkCreateFromExcel(req.user, file);
  }
  @Post('map/org-by-code')
@Permissions('md_outlet_org.map')
mapOrgByCode(@Req() req: any, @Body() dto: MapOutletOrgByCodeDto) {
  return this.service.mapOutletOrgByCode(req.user, dto);
}

@Post('map/org-by-code/bulk')
@Permissions('md_outlet_org.bulk_import')
bulkMapOrgByCode(@Req() req: any, @Body() dto: BulkMapOutletOrgByCodeDto) {
  return this.service.bulkMapOutletOrgByCode(req.user, dto);
}

@Post('map/org-by-code/bulk-excel')
@Permissions('md_outlet_org.bulk_import')
@UseInterceptors(FileInterceptor('file'))
bulkMapOrgByCodeExcel(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
  return this.service.bulkMapOrgByCodeFromExcel(req.user, file);
}

@Post('map/distributor-by-code')
@Permissions('md_outlet_distributor.map')
mapDistributorByCode(@Req() req: any, @Body() dto: MapOutletDistributorByCodeDto) {
  return this.service.mapOutletDistributorByCode(req.user, dto);
}

@Post('map/distributor-by-code/bulk')
@Permissions('md_outlet_distributor.bulk_import')
bulkMapDistributorByCode(@Req() req: any, @Body() dto: BulkMapOutletDistributorByCodeDto) {
  return this.service.bulkMapOutletDistributorByCode(req.user, dto);
}

@Post('map/distributor-by-code/bulk-excel')
@Permissions('md_outlet_distributor.bulk_import')
@UseInterceptors(FileInterceptor('file'))
bulkMapDistributorByCodeExcel(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
  return this.service.bulkMapDistributorByCodeFromExcel(req.user, file);
}
}
