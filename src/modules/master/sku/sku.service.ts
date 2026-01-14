// src/modules/master/sku/sku.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, ILike, Repository } from 'typeorm';

import { MdSku } from '../entities/md_sku.entity';
import { MdBrand } from '../entities/md_brand.entity';
import { MdCategory } from '../entities/md_category.entity';
import { MdSubCategory } from '../entities/md_sub_category.entity';

import { CreateSkuDto } from './dto/create-sku.dto';
import { UpdateSkuDto } from './dto/update-sku.dto';
import { ListSkuDto } from './dto/list-sku.dto';
import { Status } from '../../../common/constants/enums';

type AuthUser = { userId: string; company_id: string };


export type SkuListRow = {
  id: string;
  code: string;
  name: string;
  status: number;

  brand_id: string | null;
  brand_code: string | null;
  brand_name: string | null;

  category_id: string | null;
  category_code: string | null;
  category_name: string | null;

  sub_category_id: string | null;
  sub_category_code: string | null;
  sub_category_name: string | null;

  pack_size: string | null;
  base_uom: string;
  sales_uom: string;
  mrp: string | null;
  tax_rate: string;

  is_batch_tracked: boolean;
  is_expiry_tracked: boolean;

  created_at: string;
  updated_at: string;
};
type SkuViewRow = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  status: number;

  effective_from: string | null;
  effective_to: string | null;

  brand_id: string | null;
  brand_code: string | null;
  brand_name: string | null;

  category_id: string | null;
  category_code: string | null;
  category_name: string | null;

  sub_category_id: string | null;
  sub_category_code: string | null;
  sub_category_name: string | null;

  pack_size: string | null;
  base_uom: string;
  sales_uom: string;
  conversion_to_base: string;
  mrp: string | null;
  tax_rate: string;

  is_batch_tracked: boolean;
  is_expiry_tracked: boolean;

  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

function toBool(v: any): boolean {
  // Postgres sometimes returns boolean as true/false, sometimes as "t"/"f" depending on driver/raw
  if (v === true || v === false) return v;
  if (v === 't') return true;
  if (v === 'f') return false;
  return Boolean(v);
}

@Injectable()
export class SkuService {
  constructor(
    @InjectRepository(MdSku) private readonly skuRepo: Repository<MdSku>,
    @InjectRepository(MdBrand) private readonly brandRepo: Repository<MdBrand>,
    @InjectRepository(MdCategory) private readonly categoryRepo: Repository<MdCategory>,
    @InjectRepository(MdSubCategory) private readonly subCategoryRepo: Repository<MdSubCategory>,
  ) {}

  private async validateFk(companyId: string, dto: CreateSkuDto | UpdateSkuDto) {
    if (dto.brand_id) {
      const brand = await this.brandRepo.findOne({
        where: { id: dto.brand_id, company_id: companyId } as any,
        select: ['id'],
      });
      if (!brand) throw new BadRequestException('Invalid brand_id');
    }

    if (dto.category_id) {
      const cat = await this.categoryRepo.findOne({
        where: { id: dto.category_id, company_id: companyId } as any,
        select: ['id'],
      });
      if (!cat) throw new BadRequestException('Invalid category_id');
    }

    if (dto.sub_category_id) {
      const sc = await this.subCategoryRepo.findOne({
        where: { id: dto.sub_category_id, company_id: companyId } as any,
        select: ['id'],
      });
      if (!sc) throw new BadRequestException('Invalid sub_category_id');
    }
  }

  async create(auth: AuthUser, dto: CreateSkuDto) {
    await this.validateFk(auth.company_id, dto);

    const exists = await this.skuRepo.findOne({
      where: { company_id: auth.company_id, code: dto.code.trim() } as any,
      select: ['id'],
    });
    if (exists) throw new ConflictException('SKU code already exists');

    const row = this.skuRepo.create({
      company_id: auth.company_id,
      code: dto.code.trim(),
      name: dto.name.trim(),

      brand_id: dto.brand_id ?? null,
      category_id: dto.category_id ?? null,
      sub_category_id: dto.sub_category_id ?? null,

      pack_size: dto.pack_size ?? null,
      base_uom: dto.base_uom,
      sales_uom: dto.sales_uom,
      conversion_to_base: dto.conversion_to_base ?? '1',
      mrp: dto.mrp ?? null,
      tax_rate: dto.tax_rate ?? '0',
      is_batch_tracked: dto.is_batch_tracked ?? false,
      is_expiry_tracked: dto.is_expiry_tracked ?? false,

      effective_from: dto.effective_from ?? null,
      effective_to: dto.effective_to ?? null,

      status: Status.ACTIVE,
      created_by: auth.userId,
      updated_by: auth.userId,
    });

    return this.skuRepo.save(row);
  }

  async findOne(auth: AuthUser, id: string): Promise<SkuViewRow> {
  const r = await this.skuRepo
    .createQueryBuilder('s')
    .leftJoin('s.brand', 'b')
    .leftJoin('s.category', 'c')
    .leftJoin('s.sub_category', 'sc')
    .where('s.id = :id', { id })
    .andWhere('s.company_id = :companyId', { companyId: auth.company_id })
    .andWhere('s.deleted_at IS NULL')
    .select([
      's.id AS id',
      's.company_id AS company_id',
      's.code AS code',
      's.name AS name',
      's.status AS status',
      's.effective_from AS effective_from',
      's.effective_to AS effective_to',

      's.brand_id AS brand_id',
      'b.code AS brand_code',
      'b.name AS brand_name',

      's.category_id AS category_id',
      'c.code AS category_code',
      'c.name AS category_name',

      's.sub_category_id AS sub_category_id',
      'sc.code AS sub_category_code',
      'sc.name AS sub_category_name',

      's.pack_size AS pack_size',
      's.base_uom AS base_uom',
      's.sales_uom AS sales_uom',
      's.conversion_to_base AS conversion_to_base',
      's.mrp AS mrp',
      's.tax_rate AS tax_rate',
      's.is_batch_tracked AS is_batch_tracked',
      's.is_expiry_tracked AS is_expiry_tracked',

      's.created_at AS created_at',
      's.updated_at AS updated_at',
      's.created_by AS created_by',
      's.updated_by AS updated_by',
    ])
    .getRawOne<any>();

  if (!r) throw new NotFoundException('SKU not found');

  return {
    ...r,
    status: Number(r.status),
    is_batch_tracked: toBool(r.is_batch_tracked),
    is_expiry_tracked: toBool(r.is_expiry_tracked),
  };
}


  async list(auth: AuthUser, q: ListSkuDto) {
  const page = q.page ?? 1;
  const limit = Math.min(q.limit ?? 20, 200);
  const skip = (page - 1) * limit;

  // BASE query (for data)
  const qb = this.skuRepo
    .createQueryBuilder('s')
    .leftJoin('s.brand', 'b')
    .leftJoin('s.category', 'c')
    .leftJoin('s.sub_category', 'sc')
    .where('s.company_id = :companyId', { companyId: auth.company_id })
    .andWhere('s.deleted_at IS NULL');

  // Filters
  if (q.status !== undefined) qb.andWhere('s.status = :status', { status: Number(q.status) });
  if (q.brand_id) qb.andWhere('s.brand_id = :brandId', { brandId: q.brand_id });
  if (q.category_id) qb.andWhere('s.category_id = :categoryId', { categoryId: q.category_id });
  if (q.sub_category_id) qb.andWhere('s.sub_category_id = :subCategoryId', { subCategoryId: q.sub_category_id });

  // Search across sku + taxonomy
  if (q.q) {
    const term = q.q.trim();
    qb.andWhere(
      new Brackets((w) => {
        w.where('s.code ILIKE :term', { term: `%${term}%` })
          .orWhere('s.name ILIKE :term', { term: `%${term}%` })
          .orWhere('b.code ILIKE :term', { term: `%${term}%` })
          .orWhere('b.name ILIKE :term', { term: `%${term}%` })
          .orWhere('c.code ILIKE :term', { term: `%${term}%` })
          .orWhere('c.name ILIKE :term', { term: `%${term}%` })
          .orWhere('sc.code ILIKE :term', { term: `%${term}%` })
          .orWhere('sc.name ILIKE :term', { term: `%${term}%` });
      }),
    );
  }

  // Select only needed fields (flat)
  qb.select([
    's.id AS id',
    's.code AS code',
    's.name AS name',
    's.status AS status',

    's.brand_id AS brand_id',
    'b.code AS brand_code',
    'b.name AS brand_name',

    's.category_id AS category_id',
    'c.code AS category_code',
    'c.name AS category_name',

    's.sub_category_id AS sub_category_id',
    'sc.code AS sub_category_code',
    'sc.name AS sub_category_name',

    's.pack_size AS pack_size',
    's.base_uom AS base_uom',
    's.sales_uom AS sales_uom',
    's.mrp AS mrp',
    's.tax_rate AS tax_rate',
    's.is_batch_tracked AS is_batch_tracked',
    's.is_expiry_tracked AS is_expiry_tracked',

    's.created_at AS created_at',
    's.updated_at AS updated_at',
  ]);

  qb.orderBy(`s.${q.sort_by ?? 'name'}`, q.sort_dir ?? 'ASC').offset(skip).limit(limit);

  // COUNT query (same filters, no select)
  const countQb = this.skuRepo
    .createQueryBuilder('s')
    .leftJoin('s.brand', 'b')
    .leftJoin('s.category', 'c')
    .leftJoin('s.sub_category', 'sc')
    .where('s.company_id = :companyId', { companyId: auth.company_id })
    .andWhere('s.deleted_at IS NULL');

  if (q.status !== undefined) countQb.andWhere('s.status = :status', { status: Number(q.status) });
  if (q.brand_id) countQb.andWhere('s.brand_id = :brandId', { brandId: q.brand_id });
  if (q.category_id) countQb.andWhere('s.category_id = :categoryId', { categoryId: q.category_id });
  if (q.sub_category_id) countQb.andWhere('s.sub_category_id = :subCategoryId', { subCategoryId: q.sub_category_id });

  if (q.q) {
    const term = q.q.trim();
    countQb.andWhere(
      new Brackets((w) => {
        w.where('s.code ILIKE :term', { term: `%${term}%` })
          .orWhere('s.name ILIKE :term', { term: `%${term}%` })
          .orWhere('b.code ILIKE :term', { term: `%${term}%` })
          .orWhere('b.name ILIKE :term', { term: `%${term}%` })
          .orWhere('c.code ILIKE :term', { term: `%${term}%` })
          .orWhere('c.name ILIKE :term', { term: `%${term}%` })
          .orWhere('sc.code ILIKE :term', { term: `%${term}%` })
          .orWhere('sc.name ILIKE :term', { term: `%${term}%` });
      }),
    );
  }

  const [rawItems, total] = await Promise.all([qb.getRawMany(), countQb.getCount()]);

  // normalize booleans (important with raw)
  const items: SkuListRow[] = rawItems.map((r: any) => ({
    ...r,
    status: Number(r.status),
    is_batch_tracked: toBool(r.is_batch_tracked),
    is_expiry_tracked: toBool(r.is_expiry_tracked),
  }));

  return { items, total, page, limit };
}


  async update(auth: AuthUser, id: string, dto: UpdateSkuDto) {
    const row = await this.skuRepo.findOne({
      where: { id, company_id: auth.company_id } as any,
    });
    if (!row) throw new NotFoundException('SKU not found');

    await this.validateFk(auth.company_id, dto);

    if (dto.code && dto.code.trim() !== row.code) {
      const exists = await this.skuRepo.findOne({
        where: { company_id: auth.company_id, code: dto.code.trim() } as any,
        select: ['id'],
      });
      if (exists) throw new ConflictException('SKU code already exists');
      row.code = dto.code.trim();
    }

    if (dto.name !== undefined) row.name = dto.name.trim();

    if (dto.brand_id !== undefined) row.brand_id = dto.brand_id ?? null;
    if (dto.category_id !== undefined) row.category_id = dto.category_id ?? null;
    if (dto.sub_category_id !== undefined) row.sub_category_id = dto.sub_category_id ?? null;

    if (dto.pack_size !== undefined) row.pack_size = dto.pack_size ?? null;
    if (dto.base_uom !== undefined) row.base_uom = dto.base_uom;
    if (dto.sales_uom !== undefined) row.sales_uom = dto.sales_uom;

    if (dto.conversion_to_base !== undefined) row.conversion_to_base = dto.conversion_to_base;
    if (dto.mrp !== undefined) row.mrp = dto.mrp ?? null;
    if (dto.tax_rate !== undefined) row.tax_rate = dto.tax_rate;

    if (dto.is_batch_tracked !== undefined) row.is_batch_tracked = dto.is_batch_tracked;
    if (dto.is_expiry_tracked !== undefined) row.is_expiry_tracked = dto.is_expiry_tracked;

    if (dto.effective_from !== undefined) row.effective_from = dto.effective_from ?? null;
    if (dto.effective_to !== undefined) row.effective_to = dto.effective_to ?? null;

    row.updated_by = auth.userId;

    return this.skuRepo.save(row);
  }

  async softDelete(auth: AuthUser, id: string) {
    const row = await this.skuRepo.findOne({
      where: { id, company_id: auth.company_id } as any,
    });
    if (!row) throw new NotFoundException('SKU not found');

    row.deleted_at = new Date();
    row.deleted_by = auth.userId;
    row.status = Status.INACTIVE;
    row.updated_by = auth.userId;

    return this.skuRepo.save(row);
  }

  async setStatus(auth: AuthUser, id: string, status: number, reason?: string | null) {
    const row = await this.skuRepo.findOne({
      where: { id, company_id: auth.company_id } as any,
    });
    if (!row) throw new NotFoundException('SKU not found');

    row.status = status;
    row.updated_by = auth.userId;

    if (status === Status.INACTIVE) {
      row.inactivated_at = new Date();
      row.inactivation_reason = reason ?? null;
    } else {
      row.inactivated_at = null;
      row.inactivation_reason = null;
    }

    return this.skuRepo.save(row);
  }
}
