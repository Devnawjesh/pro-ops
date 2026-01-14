// src/modules/master/product-taxonomy/product-taxonomy.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Status } from 'src/common/constants/enums';

import { MdBrand } from '../entities/md_brand.entity';
import { MdCategory } from '../entities/md_category.entity';
import { MdSubCategory } from '../entities/md_sub_category.entity';

import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { ListDto } from './dto/list.dto';

/**
 * NOTE (important):
 * - Your BaseMasterEntity.id is bigint.
 * - So MdSubCategory.category_id MUST be bigint too (string in TS).
 *   Ensure md_sub_category.entity.ts has: @Column({ type: 'bigint' }) category_id!: string;
 *
 * Optional DTO enhancements supported here (if you add them):
 * - dto.effective_from?: string | null
 * - dto.effective_to?: string | null
 * - status change endpoints accept { status: number, reason?: string }
 */

@Injectable()
export class ProductTaxonomyService {
  constructor(
    @InjectRepository(MdBrand) private readonly brandRepo: Repository<MdBrand>,
    @InjectRepository(MdCategory) private readonly categoryRepo: Repository<MdCategory>,
    @InjectRepository(MdSubCategory) private readonly subCategoryRepo: Repository<MdSubCategory>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  // ---------- helpers ----------
  private normalizeCode(code: string) {
    return code.trim();
  }
  private normalizeName(name: string) {
    return name.trim();
  }
  private asBool(v?: any) {
    return v === true || v === 'true' || v === '1' || v === 1;
  }

  private applyListFilters<T extends { status: any; deleted_at: any; name: any }>(
    qb: any,
    alias: string,
    companyId: string,
    q: ListDto,
  ) {
    const includeInactive = this.asBool((q as any).include_inactive);
    const includeDeleted = this.asBool((q as any).include_deleted);

    qb.where(`${alias}.company_id = :companyId`, { companyId });

    if (!includeDeleted) qb.andWhere(`${alias}.deleted_at IS NULL`);
    if (!includeInactive) qb.andWhere(`${alias}.status = :st`, { st: Status.ACTIVE });

    if (q.q) qb.andWhere(`${alias}.name ILIKE :qq`, { qq: `%${q.q.trim()}%` });

    qb.orderBy(`${alias}.name`, 'ASC')
      .skip(q.offset ?? 0)
      .take(q.limit ?? 50);

    return qb;
  }

  private patchBaseAudit(ent: any, actorId: string | null, isCreate: boolean) {
    if (isCreate) ent.created_by = actorId;
    ent.updated_by = actorId;
  }

  private patchEffective(ent: any, dto: any) {
    if (dto.effective_from !== undefined) ent.effective_from = dto.effective_from ?? null;
    if (dto.effective_to !== undefined) ent.effective_to = dto.effective_to ?? null;
  }

  // =========================================================
  // BRANDS
  // =========================================================

  async listBrands(companyId: string, q: ListDto) {
    const qb = this.brandRepo.createQueryBuilder('b');
    this.applyListFilters(qb, 'b', companyId, q);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getBrand(companyId: string, id: string, opts?: { include_deleted?: boolean }) {
    const includeDeleted = this.asBool(opts?.include_deleted);
    const qb = this.brandRepo
      .createQueryBuilder('b')
      .where('b.company_id = :companyId', { companyId })
      .andWhere('b.id = :id', { id });

    if (!includeDeleted) qb.andWhere('b.deleted_at IS NULL');

    const brand = await qb.getOne();
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async createBrand(companyId: string, actorId: string | null, dto: CreateBrandDto) {
    const code = this.normalizeCode(dto.code);
    const name = this.normalizeName(dto.name);

    const exists = await this.brandRepo.findOne({
      where: { company_id: companyId, code } as any,
      select: { id: true },
    });
    if (exists) throw new ConflictException(`Brand code already exists: ${code}`);

    const ent = this.brandRepo.create({
      company_id: companyId,
      code,
      name,
      description: (dto as any).description?.trim?.() ?? null,
      status: Status.ACTIVE,
    } as any);

    this.patchEffective(ent, dto);
    this.patchBaseAudit(ent, actorId, true);

    try {
      return await this.brandRepo.save(ent);
    } catch {
      throw new ConflictException('Brand already exists (conflict).');
    }
  }

  async updateBrand(companyId: string, actorId: string | null, id: string, dto: UpdateBrandDto) {
    const brand = await this.getBrand(companyId, id);

    if ((dto as any).code !== undefined) {
      const code = this.normalizeCode((dto as any).code);
      const dup = await this.brandRepo.findOne({
        where: { company_id: companyId, code } as any,
        select: { id: true },
      });
      if (dup && dup.id !== id) throw new ConflictException(`Brand code already exists: ${code}`);
      (brand as any).code = code;
    }

    if ((dto as any).name !== undefined) (brand as any).name = this.normalizeName((dto as any).name);
    if ((dto as any).description !== undefined)
      (brand as any).description = (dto as any).description?.trim?.() ?? null;

    this.patchEffective(brand, dto);
    this.patchBaseAudit(brand, actorId, false);

    try {
      return await this.brandRepo.save(brand);
    } catch {
      throw new ConflictException('Brand update conflict.');
    }
  }

  async changeBrandStatus(
    companyId: string,
    actorId: string | null,
    id: string,
    dto: { status: number; reason?: string },
  ) {
    const brand = await this.getBrand(companyId, id);

    (brand as any).status = dto.status;
    if (dto.status === Status.INACTIVE) {
      (brand as any).inactivated_at = new Date();
      (brand as any).inactivation_reason = dto.reason?.trim?.() ?? null;
    } else {
      (brand as any).inactivated_at = null;
      (brand as any).inactivation_reason = null;
    }

    this.patchBaseAudit(brand, actorId, false);
    return this.brandRepo.save(brand);
  }

  async deleteBrand(companyId: string, actorId: string | null, id: string) {
    const brand = await this.getBrand(companyId, id);

    // soft delete
    (brand as any).deleted_at = new Date();
    (brand as any).deleted_by = actorId;
    (brand as any).status = Status.INACTIVE;
    (brand as any).inactivated_at = (brand as any).inactivated_at ?? new Date();

    this.patchBaseAudit(brand, actorId, false);

    try {
      await this.brandRepo.save(brand);
      return { success: true };
    } catch {
      throw new BadRequestException('Cannot delete brand. It may be used by SKUs.');
    }
  }

  // =========================================================
  // CATEGORIES
  // =========================================================

  async listCategories(companyId: string, q: ListDto) {
    const qb = this.categoryRepo.createQueryBuilder('c');
    this.applyListFilters(qb, 'c', companyId, q);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getCategory(companyId: string, id: string, opts?: { include_deleted?: boolean }) {
    const includeDeleted = this.asBool(opts?.include_deleted);
    const qb = this.categoryRepo
      .createQueryBuilder('c')
      .where('c.company_id = :companyId', { companyId })
      .andWhere('c.id = :id', { id });

    if (!includeDeleted) qb.andWhere('c.deleted_at IS NULL');

    const cat = await qb.getOne();
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async createCategory(companyId: string, actorId: string | null, dto: CreateCategoryDto) {
    const code = this.normalizeCode(dto.code);

    const exists = await this.categoryRepo.findOne({
      where: { company_id: companyId, code } as any,
      select: { id: true },
    });
    if (exists) throw new ConflictException(`Category code already exists: ${code}`);

    const ent = this.categoryRepo.create({
      company_id: companyId,
      code,
      name: this.normalizeName(dto.name),
      description: (dto as any).description?.trim?.() ?? null,
      status: Status.ACTIVE,
    } as any);

    this.patchEffective(ent, dto);
    this.patchBaseAudit(ent, actorId, true);

    try {
      return await this.categoryRepo.save(ent);
    } catch {
      throw new ConflictException('Category already exists (conflict).');
    }
  }

  async updateCategory(companyId: string, actorId: string | null, id: string, dto: UpdateCategoryDto) {
    const cat = await this.getCategory(companyId, id);

    if ((dto as any).code !== undefined) {
      const code = this.normalizeCode((dto as any).code);
      const dup = await this.categoryRepo.findOne({
        where: { company_id: companyId, code } as any,
        select: { id: true },
      });
      if (dup && dup.id !== id) throw new ConflictException(`Category code already exists: ${code}`);
      (cat as any).code = code;
    }

    if ((dto as any).name !== undefined) (cat as any).name = this.normalizeName((dto as any).name);
    if ((dto as any).description !== undefined)
      (cat as any).description = (dto as any).description?.trim?.() ?? null;

    this.patchEffective(cat, dto);
    this.patchBaseAudit(cat, actorId, false);

    try {
      return await this.categoryRepo.save(cat);
    } catch {
      throw new ConflictException('Category update conflict.');
    }
  }

  async changeCategoryStatus(
    companyId: string,
    actorId: string | null,
    id: string,
    dto: { status: number; reason?: string },
  ) {
    const cat = await this.getCategory(companyId, id);

    (cat as any).status = dto.status;
    if (dto.status === Status.INACTIVE) {
      (cat as any).inactivated_at = new Date();
      (cat as any).inactivation_reason = dto.reason?.trim?.() ?? null;
    } else {
      (cat as any).inactivated_at = null;
      (cat as any).inactivation_reason = null;
    }

    this.patchBaseAudit(cat, actorId, false);
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(companyId: string, actorId: string | null, id: string) {
    const cat = await this.getCategory(companyId, id);

    (cat as any).deleted_at = new Date();
    (cat as any).deleted_by = actorId;
    (cat as any).status = Status.INACTIVE;
    (cat as any).inactivated_at = (cat as any).inactivated_at ?? new Date();

    this.patchBaseAudit(cat, actorId, false);

    try {
      await this.categoryRepo.save(cat);
      return { success: true };
    } catch {
      throw new BadRequestException('Cannot delete category. It may be used by sub-categories/SKUs.');
    }
  }

  // =========================================================
  // SUB-CATEGORIES
  // =========================================================

  async listSubCategories(companyId: string, q: ListDto & { category_id?: string }) {
    const qb = this.subCategoryRepo
      .createQueryBuilder('sc')
      .leftJoinAndSelect('sc.category', 'c');

    this.applyListFilters(qb, 'sc', companyId, q);

    if ((q as any).category_id) {
      qb.andWhere('sc.category_id = :categoryId', { categoryId: (q as any).category_id });
    }

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async getSubCategory(companyId: string, id: string, opts?: { include_deleted?: boolean }) {
    const includeDeleted = this.asBool(opts?.include_deleted);

    const qb = this.subCategoryRepo
      .createQueryBuilder('sc')
      .leftJoinAndSelect('sc.category', 'c')
      .where('sc.company_id = :companyId', { companyId })
      .andWhere('sc.id = :id', { id });

    if (!includeDeleted) qb.andWhere('sc.deleted_at IS NULL');

    const sc = await qb.getOne();
    if (!sc) throw new NotFoundException('Sub-category not found');
    return sc;
  }

  async createSubCategory(companyId: string, actorId: string | null, dto: CreateSubCategoryDto) {
    return this.ds.transaction(async (trx) => {
      // validate category exists (and not deleted)
      const category = await trx.getRepository(MdCategory).findOne({
        where: { id: (dto as any).category_id, company_id: companyId, deleted_at: null } as any,
        select: { id: true },
      });
      if (!category) throw new BadRequestException('Invalid category_id');

      const code = this.normalizeCode(dto.code);
      const exists = await trx.getRepository(MdSubCategory).findOne({
        where: { company_id: companyId, code } as any,
        select: { id: true },
      });
      if (exists) throw new ConflictException(`Sub-category code already exists: ${code}`);

      const ent = trx.getRepository(MdSubCategory).create({
        company_id: companyId,
        code,
        category_id: (dto as any).category_id, // bigint string
        name: this.normalizeName(dto.name),
        description: (dto as any).description?.trim?.() ?? null,
        status: Status.ACTIVE,
      } as any);

      this.patchEffective(ent, dto);
      this.patchBaseAudit(ent, actorId, true);

      try {
        return await trx.getRepository(MdSubCategory).save(ent);
      } catch {
        throw new ConflictException('Sub-category already exists (conflict).');
      }
    });
  }

  async updateSubCategory(
    companyId: string,
    actorId: string | null,
    id: string,
    dto: UpdateSubCategoryDto,
  ) {
    return this.ds.transaction(async (trx) => {
      const repo = trx.getRepository(MdSubCategory);

      const sc = await repo.findOne({
        where: { id, company_id: companyId, deleted_at: null } as any,
      });
      if (!sc) throw new NotFoundException('Sub-category not found');

      if ((dto as any).category_id !== undefined) {
        const cat = await trx.getRepository(MdCategory).findOne({
          where: { id: (dto as any).category_id, company_id: companyId, deleted_at: null } as any,
          select: { id: true },
        });
        if (!cat) throw new BadRequestException('Invalid category_id');
        (sc as any).category_id = (dto as any).category_id;
      }

      if ((dto as any).code !== undefined) {
        const code = this.normalizeCode((dto as any).code);
        const dup = await repo.findOne({
          where: { company_id: companyId, code } as any,
          select: { id: true },
        });
        if (dup && dup.id !== id) throw new ConflictException(`Sub-category code already exists: ${code}`);
        (sc as any).code = code;
      }

      if ((dto as any).name !== undefined) (sc as any).name = this.normalizeName((dto as any).name);
      if ((dto as any).description !== undefined)
        (sc as any).description = (dto as any).description?.trim?.() ?? null;

      this.patchEffective(sc, dto);
      this.patchBaseAudit(sc, actorId, false);

      try {
        return await repo.save(sc);
      } catch {
        throw new ConflictException('Sub-category update conflict.');
      }
    });
  }

  async changeSubCategoryStatus(
    companyId: string,
    actorId: string | null,
    id: string,
    dto: { status: number; reason?: string },
  ) {
    const sc = await this.getSubCategory(companyId, id);

    (sc as any).status = dto.status;
    if (dto.status === Status.INACTIVE) {
      (sc as any).inactivated_at = new Date();
      (sc as any).inactivation_reason = dto.reason?.trim?.() ?? null;
    } else {
      (sc as any).inactivated_at = null;
      (sc as any).inactivation_reason = null;
    }

    this.patchBaseAudit(sc, actorId, false);
    return this.subCategoryRepo.save(sc);
  }

  async deleteSubCategory(companyId: string, actorId: string | null, id: string) {
    const sc = await this.getSubCategory(companyId, id);

    (sc as any).deleted_at = new Date();
    (sc as any).deleted_by = actorId;
    (sc as any).status = Status.INACTIVE;
    (sc as any).inactivated_at = (sc as any).inactivated_at ?? new Date();

    this.patchBaseAudit(sc, actorId, false);

    try {
      await this.subCategoryRepo.save(sc);
      return { success: true };
    } catch {
      throw new BadRequestException('Cannot delete sub-category. It may be used by SKUs.');
    }
  }
}
