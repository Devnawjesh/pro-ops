// src/modules/pricing/pricing.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

import { PricingService } from './pricing.service';

import { ListPriceListDto } from './dto/price-list/list-price-list.dto';
import { CreatePriceListDto } from './dto/price-list/create-price-list.dto';
import { UpdatePriceListDto } from './dto/price-list/update-price-list.dto';
import { BulkImportPriceListDto } from './dto/price-list/bulk-import-price-list.dto';

import { ListSchemeDto } from './dto/schema/list-scheme.dto';
import { CreateSchemeDto } from './dto/schema/create-scheme.dto';
import { UpdateSchemeDto } from './dto/schema/update-scheme.dto';
import { BulkImportSchemeDto } from './dto/schema/bulk-import-scheme.dto';

import { ResolvePriceDto } from './dto/resolve-price.dto';
import { ApplySchemeDto } from './dto/apply-scheme.dto';
import { CreateSchemeRuleDto } from './dto/schema/create-scheme-rule.dto';
import { UpdateSchemeRuleDto } from './dto/schema/update-scheme-rule.dto';

@Controller('pricing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PricingController {
  constructor(private readonly service: PricingService) {}

  // ---------------- PriceList ----------------

  @Post('price-lists')
  @Permissions('md_price_list.create')
  createPriceList(@Req() req: any, @Body() dto: CreatePriceListDto) {
    return this.service.createPriceList(req.user, dto);
  }

  @Get('price-lists')
  @Permissions('md_price_list.list')
  listPriceLists(@Req() req: any, @Query() dto: ListPriceListDto) {
    return this.service.listPriceLists(req.user, dto);
  }
// ---------------- PriceList Items ----------------

@Put('price-lists/:id/items')
@Permissions('md_price_list.update')
upsertPriceListItems(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
  return this.service.upsertPriceListItems(req.user, id, dto);
}

// ---------------- PriceList Scopes ----------------

@Post('price-lists/:id/scopes')
@Permissions('md_price_list.update')
createPriceListScope(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
  return this.service.createPriceListScope(req.user, id, dto);
}

  @Get('price-lists/:id')
  @Permissions('md_price_list.view')
  getPriceList(@Req() req: any, @Param('id') id: string) {
    return this.service.getPriceList(req.user, id);
  }

  @Patch('price-lists/:id')
  @Permissions('md_price_list.update')
  updatePriceList(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.service.updatePriceList(req.user, id, dto);
  }

  @Delete('price-lists/:id')
  @Permissions('md_price_list.delete')
  deletePriceList(@Req() req: any, @Param('id') id: string) {
    return this.service.softDeletePriceList(req.user, id);
  }

  /**
   * Bulk import (base64 payload)
   * POST /pricing/price-lists/bulk-import
   * {
   *   "file_base64": "...",
   *   "sheet_price_list": "price_list",
   *   "sheet_item": "price_list_item",
   *   "sheet_scope": "price_list_scope"
   * }
   */
  @Post('price-lists/bulk-import')
  @Permissions('md_price_list.bulk_import')
  bulkImportPriceList(@Req() req: any, @Body() dto: BulkImportPriceListDto) {
    return this.service.bulkImportPriceList(req.user, dto);
  }

  /**
   * Bulk import by multipart upload (form-data: file)
   * POST /pricing/price-lists/bulk-import-file
   *
   * NOTE: uses memoryStorage so file.buffer exists.
   */
  @Post('price-lists/bulk-import-file')
  @Permissions('md_price_list.bulk_import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  bulkImportPriceListFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const dto: BulkImportPriceListDto = {
      file_base64: file.buffer.toString('base64'),
    } as any;

    return this.service.bulkImportPriceList(req.user, dto);
  }

  // ---------------- Resolve Price ----------------

  @Post('resolve-price')
  @Permissions('md_price_list.view')
  resolvePrice(@Req() req: any, @Body() dto: ResolvePriceDto) {
    return this.service.resolveBestPrice(req.user, dto);
  }

  @Post('resolve-price/bulk')
  @Permissions('md_price_list.view')
  resolvePriceBulk(
    @Req() req: any,
    @Body()
    dto: {
      date: string;
      context: { distributor_id?: string; outlet_type?: number; org_node_id?: string };
      skus: Array<{ sku_id?: string; sku_code?: string }>;
    },
  ) {
    return this.service.resolveBestPriceBulk(req.user, dto);
  }

  // ---------------- Scheme ----------------

  @Post('schemes')
  @Permissions('md_scheme.create')
  createScheme(@Req() req: any, @Body() dto: CreateSchemeDto) {
    return this.service.createScheme(req.user, dto);
  }

  @Get('schemes')
  @Permissions('md_scheme.list')
  listSchemes(@Req() req: any, @Query() dto: ListSchemeDto) {
    return this.service.listSchemes(req.user, dto);
  }
@Post('schemes/:id/rules')
@Permissions('md_scheme.update')
createSchemeRule(@Req() req: any, @Param('id') id: string, @Body() dto: CreateSchemeRuleDto) {
  return this.service.createSchemeRule(req.user, id, dto);
}

// Update single rule
@Patch('schemes/:id/rules/:ruleId')
@Permissions('md_scheme.update')
updateSchemeRule(
  @Req() req: any,
  @Param('id') id: string,
  @Param('ruleId') ruleId: string,
  @Body() dto: UpdateSchemeRuleDto,
) {
  return this.service.updateSchemeRule(req.user, id, ruleId, dto);
}

// Delete single rule
@Delete('schemes/:id/rules/:ruleId')
@Permissions('md_scheme.update')
deleteSchemeRule(@Req() req: any, @Param('id') id: string, @Param('ruleId') ruleId: string) {
  return this.service.softDeleteSchemeRule(req.user, id, ruleId);
}
  @Get('schemes/:id')
  @Permissions('md_scheme.view')
  getScheme(@Req() req: any, @Param('id') id: string) {
    return this.service.getScheme(req.user, id);
  }

  @Patch('schemes/:id')
  @Permissions('md_scheme.update')
  updateScheme(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSchemeDto) {
    return this.service.updateScheme(req.user, id, dto);
  }

  @Delete('schemes/:id')
  @Permissions('md_scheme.delete')
  deleteScheme(@Req() req: any, @Param('id') id: string) {
    return this.service.softDeleteScheme(req.user, id);
  }

  /**
   * Bulk import (base64 payload)
   * POST /pricing/schemes/bulk-import
   * {
   *   "file_base64": "...",
   *   "sheet_scheme": "scheme",
   *   "sheet_rule": "scheme_rule"
   * }
   */
  @Post('schemes/bulk-import')
  @Permissions('md_scheme.bulk_import')
  bulkImportScheme(@Req() req: any, @Body() dto: BulkImportSchemeDto) {
    return this.service.bulkImportScheme(req.user, dto);
  }

  /**
   * Bulk import by multipart upload (form-data: file)
   * POST /pricing/schemes/bulk-import-file
   *
   * NOTE: uses memoryStorage so file.buffer exists.
   */
  @Post('schemes/bulk-import-file')
  @Permissions('md_scheme.bulk_import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  bulkImportSchemeFile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const dto: BulkImportSchemeDto = {
      file_base64: file.buffer.toString('base64'),
    } as any;

    return this.service.bulkImportScheme(req.user, dto);
  }

  // ---------------- Apply Schemes ----------------

  @Post('apply-schemes')
  @Permissions('md_scheme.view')
  applySchemes(@Req() req: any, @Body() dto: ApplySchemeDto) {
    return this.service.applySchemesToOrder(req.user, dto);
  }
}
