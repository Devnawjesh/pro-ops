// src/modules/master/product-taxonomy/product-taxonomy.controller.ts
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

import { ProductTaxonomyService } from './product-taxonomy.service';

import { ListDto } from './dto/list.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';

@Controller('master/product-taxonomy')
export class ProductTaxonomyController {
  constructor(private readonly svc: ProductTaxonomyService) {}

  private companyId(req: any): string {
    const companyId = req?.user?.company_id;
    if (!companyId) throw new Error('company_id missing from JWT payload');
    return companyId;
  }

  private actorId(req: any): string | null {
    // common JWT payloads: sub or id
    return req?.user?.sub ?? req?.user?.id ?? null;
  }

  // =========================================================
  // BRANDS
  // =========================================================

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:view')
  @Get('brands')
  listBrands(@Req() req: any, @Query() q: ListDto) {
    return this.svc.listBrands(this.companyId(req), q);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:view')
  @Get('brands/:id')
  getBrand(@Req() req: any, @Param('id') id: string) {
    return this.svc.getBrand(this.companyId(req), id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Post('brands')
  createBrand(@Req() req: any, @Body() dto: CreateBrandDto) {
    return this.svc.createBrand(this.companyId(req), this.actorId(req), dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Patch('brands/:id')
  updateBrand(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.svc.updateBrand(this.companyId(req), this.actorId(req), id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Patch('brands/:id/status')
  changeBrandStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { status: number; reason?: string },
  ) {
    return this.svc.changeBrandStatus(this.companyId(req), this.actorId(req), id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Delete('brands/:id')
  deleteBrand(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteBrand(this.companyId(req), this.actorId(req), id);
  }

  // =========================================================
  // CATEGORIES
  // =========================================================

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:view')
  @Get('categories')
  listCategories(@Req() req: any, @Query() q: ListDto) {
    return this.svc.listCategories(this.companyId(req), q);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:view')
  @Get('categories/:id')
  getCategory(@Req() req: any, @Param('id') id: string) {
    return this.svc.getCategory(this.companyId(req), id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Post('categories')
  createCategory(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(this.companyId(req), this.actorId(req), dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Patch('categories/:id')
  updateCategory(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.updateCategory(this.companyId(req), this.actorId(req), id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Patch('categories/:id/status')
  changeCategoryStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { status: number; reason?: string },
  ) {
    return this.svc.changeCategoryStatus(this.companyId(req), this.actorId(req), id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Delete('categories/:id')
  deleteCategory(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteCategory(this.companyId(req), this.actorId(req), id);
  }

  // =========================================================
  // SUB-CATEGORIES
  // =========================================================

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:view')
  @Get('sub-categories')
  listSubCategories(@Req() req: any, @Query() q: ListDto & { category_id?: string }) {
    return this.svc.listSubCategories(this.companyId(req), q);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:view')
  @Get('sub-categories/:id')
  getSubCategory(@Req() req: any, @Param('id') id: string) {
    return this.svc.getSubCategory(this.companyId(req), id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Post('sub-categories')
  createSubCategory(@Req() req: any, @Body() dto: CreateSubCategoryDto) {
    return this.svc.createSubCategory(this.companyId(req), this.actorId(req), dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Patch('sub-categories/:id')
  updateSubCategory(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSubCategoryDto) {
    return this.svc.updateSubCategory(this.companyId(req), this.actorId(req), id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Patch('sub-categories/:id/status')
  changeSubCategoryStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: { status: number; reason?: string },
  ) {
    return this.svc.changeSubCategoryStatus(this.companyId(req), this.actorId(req), id, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('master:taxonomy:manage')
  @Delete('sub-categories/:id')
  deleteSubCategory(@Req() req: any, @Param('id') id: string) {
    return this.svc.deleteSubCategory(this.companyId(req), this.actorId(req), id);
  }
}
