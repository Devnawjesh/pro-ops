// src/modules/inventory/distributor-stock-policy/distributor-stock-policy.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import {
  InvDistributorStockPolicyEntity,
  StockPolicyStatus,
} from './entities/distributor-stock-policy.entity';
import { CreateDistributorStockPolicyDto } from './dto/create-distributor-stock-policy.dto';
import { UpdateDistributorStockPolicyDto } from './dto/update-distributor-stock-policy.dto';
import { ListDistributorStockPolicyDto } from './dto/list-distributor-stock-policy.dto';

@Injectable()
export class DistributorStockPolicyService {
  constructor(
    @InjectRepository(InvDistributorStockPolicyEntity)
    private readonly repo: Repository<InvDistributorStockPolicyEntity>,
  ) {}

  private validateMinMax(minQty?: string | null, maxQty?: string | null) {
    if (minQty != null && maxQty != null) {
      const min = Number(minQty);
      const max = Number(maxQty);
      if (!Number.isFinite(min) || !Number.isFinite(max)) throw new BadRequestException('Invalid min/max');
      if (min > max) throw new BadRequestException('minQty cannot be greater than maxQty');
    }
  }

  async create(dto: CreateDistributorStockPolicyDto, actorUserId?: string) {
    this.validateMinMax(dto.minQty ?? null, dto.maxQty ?? null);

    const entity = this.repo.create({
      companyId: dto.companyId,
      distributorId: dto.distributorId,
      skuId: dto.skuId,
      minQty: dto.minQty ?? null,
      maxQty: dto.maxQty ?? null,
      status: dto.status ?? StockPolicyStatus.ACTIVE,
      createdBy: actorUserId ?? null,
      updatedBy: actorUserId ?? null,
    });

    try {
      return await this.repo.save(entity);
    } catch (e: any) {
      // Postgres unique violation
      if (e?.code === '23505') {
        throw new BadRequestException('Policy already exists for (company_id, distributor_id, sku_id)');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateDistributorStockPolicyDto, actorUserId?: string) {
    const found = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!found) throw new NotFoundException('Policy not found');

    // If you want IDs immutable, do NOT assign companyId/distributorId/skuId here.
    const minQty = dto.minQty !== undefined ? dto.minQty : found.minQty;
    const maxQty = dto.maxQty !== undefined ? dto.maxQty : found.maxQty;
    this.validateMinMax(minQty ?? null, maxQty ?? null);

    if (dto.minQty !== undefined) found.minQty = dto.minQty ?? null;
    if (dto.maxQty !== undefined) found.maxQty = dto.maxQty ?? null;
    if (dto.status !== undefined) found.status = dto.status;

    found.updatedBy = actorUserId ?? dto.updatedBy ?? found.updatedBy;

    try {
      return await this.repo.save(found);
    } catch (e: any) {
      if (e?.code === '23505') {
        throw new BadRequestException('Policy already exists for (company_id, distributor_id, sku_id)');
      }
      throw e;
    }
  }

  async softDelete(id: string, actorUserId?: string) {
    const found = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!found) throw new NotFoundException('Policy not found');

    found.deletedAt = new Date();
    found.updatedBy = actorUserId ?? found.updatedBy;

    return this.repo.save(found);
  }

  async getById(id: string) {
    const found = await this.repo.findOne({ where: { id, deletedAt: IsNull() } });
    if (!found) throw new NotFoundException('Policy not found');
    return found;
  }

  async list(dto: ListDistributorStockPolicyDto) {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('p').where('p.deleted_at IS NULL');

    if (dto.companyId) qb.andWhere('p.company_id = :companyId', { companyId: dto.companyId });
    if (dto.distributorId) qb.andWhere('p.distributor_id = :distributorId', { distributorId: dto.distributorId });
    if (dto.skuId) qb.andWhere('p.sku_id = :skuId', { skuId: dto.skuId });
    if (dto.status) qb.andWhere('p.status = :status', { status: dto.status });

    qb.orderBy('p.updated_at', 'DESC').skip(skip).take(limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      page,
      limit,
      total,
      rows,
    };
  }
  async listWithDetails(dto: ListDistributorStockPolicyDto) {
  const page = dto.page ?? 1;
  const limit = Math.min(dto.limit ?? 50, 200);
  const skip = (page - 1) * limit;

  const qb = this.repo
    .createQueryBuilder('p')
    .leftJoin('md_sku', 's',
      `s.id = p.sku_id
       AND s.company_id = p.company_id
       AND s.deleted_at IS NULL`
    )
    // CHANGE THIS JOIN to your distributor master table
    .leftJoin('md_distributor', 'd',
      `d.id::text = p.distributor_id::text
       AND d.company_id = p.company_id
       AND d.deleted_at IS NULL`
    )
    .leftJoin('md_distributor', 'd',
      `d.id = w.owner_id AND d.company_id = b.company_id AND d.deleted_at IS NULL`
    )
    .where('p.deleted_at IS NULL');

  if (dto.companyId) qb.andWhere('p.company_id = :companyId', { companyId: dto.companyId });
  if (dto.distributorId) qb.andWhere('p.distributor_id = :distributorId', { distributorId: dto.distributorId });
  if (dto.skuId) qb.andWhere('p.sku_id = :skuId', { skuId: dto.skuId });
  if (dto.status) qb.andWhere('p.status = :status', { status: dto.status });

  qb.select([
    'p.id AS id',
    'p.company_id AS "companyId"',
    'p.distributor_id AS "distributorId"',
    'p.sku_id AS "skuId"',
    'p.min_qty AS "minQty"',
    'p.max_qty AS "maxQty"',
    'p.status AS status',
    'p.updated_at AS "updatedAt"',

    // sku fields (adjust column names if different)
    's.code AS "skuCode"',
    's.name AS "skuName"',

    // distributor fields (adjust column names if different)
    'd.code AS "distributorCode"',
    'd.name AS "distributorName"',
  ]);

  qb.orderBy('p.updated_at', 'DESC').offset(skip).limit(limit);

  const [rows, total] = await Promise.all([
    qb.getRawMany(),
    qb.getCount(),
  ]);

  return { page, limit, total, rows };
}

}
