// src/modules/master/warehouse/md-warehouse.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';

import { MdWarehouse } from '../entities/md_warehouse.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ListWarehouseDto } from './dto/list-warehouse.dto';
import { MdDistributor } from '../../distributors/entities/distributor.entity';
import { Status, DistributorType, WarehouseOwnerType } from 'src/common/constants/enums';

type AuthUser = { company_id: string; user_id: string };

@Injectable()
export class MdWarehouseService {
  constructor(
    @InjectRepository(MdWarehouse)
    private readonly warehouseRepo: Repository<MdWarehouse>,
    @InjectRepository(MdDistributor)
    private readonly distributorRepo: Repository<MdDistributor>,
  ) {}

  async create(auth: AuthUser, dto: CreateWarehouseDto) {
  await this.assertValidOwner(auth, dto.owner_type, dto.owner_id);

  const exists = await this.warehouseRepo.exist({
    where: {
      company_id: auth.company_id as any,
      code: dto.code as any,
      deleted_at: IsNull(),
    } as any,
  });
  if (exists) throw new ConflictException('Warehouse code already exists');

  const isDefault = dto.is_default ?? false;
  const ownerId = dto.owner_id ?? null;

  if (isDefault) {
    await this.unsetOtherDefaults(auth, dto.owner_type, ownerId);
  }

  const row = this.warehouseRepo.create({
    company_id: auth.company_id,
    code: dto.code.trim(),
    name: dto.name.trim(),
    owner_type: dto.owner_type,
    owner_id: ownerId,
    address: dto.address ?? null,
    lat: dto.lat ?? null,
    lng: dto.lng ?? null,
    is_batch_tracked: dto.is_batch_tracked ?? false,
    is_expiry_tracked: dto.is_expiry_tracked ?? false,
    is_default: isDefault,
    effective_from: dto.effective_from ?? null,
    effective_to: dto.effective_to ?? null,
    created_by: auth.user_id,
    updated_by: auth.user_id,
  });

  return await this.warehouseRepo.save(row);
}

  async list(auth: AuthUser, q: ListWarehouseDto) {
  const page = q.page ?? 1;
  const limit = q.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortMap: Record<string, string> = {
    code: 'w.code',
    name: 'w.name',
    status: 'w.status',
    created_at: 'w.created_at',
    updated_at: 'w.updated_at',
  };
  const sortCol = sortMap[q.sort_by ?? 'updated_at'] ?? 'w.updated_at';
  const sortDir = (q.sort_dir ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

  const qb = this.warehouseRepo
    .createQueryBuilder('w')
    .leftJoin(
      MdDistributor,
      'd',
      'd.company_id = w.company_id AND d.id = w.owner_id AND d.deleted_at IS NULL',
    )
    .where('w.company_id = :company_id', { company_id: auth.company_id })
    .andWhere('w.deleted_at IS NULL');

  if (q.status !== undefined) qb.andWhere('w.status = :status', { status: q.status });
  if (q.owner_type !== undefined) qb.andWhere('w.owner_type = :owner_type', { owner_type: q.owner_type });
  if (q.owner_id) qb.andWhere('w.owner_id = :owner_id', { owner_id: q.owner_id });

  if (q.q?.trim()) {
    const term = `%${q.q.trim()}%`;
    qb.andWhere(
      new Brackets((b) => {
        b.where('w.code ILIKE :term', { term }).orWhere('w.name ILIKE :term', { term });
      }),
    );
  }

  const total = await qb.clone().getCount();

  const items = await qb
    .select([
      'w.id as id',
      'w.company_id as company_id',
      'w.code as code',
      'w.name as name',
      'w.status as status',
      'w.owner_type as owner_type',
      'w.owner_id as owner_id',
      'w.address as address',
      'w.lat as lat',
      'w.lng as lng',
      'w.is_default as is_default',
      'w.is_batch_tracked as is_batch_tracked',
      'w.is_expiry_tracked as is_expiry_tracked',
      'w.effective_from as effective_from',
      'w.effective_to as effective_to',
      'w.created_at as created_at',
      'w.updated_at as updated_at',

      // owner fields (only meaningful for distributor/sub-distributor)
      'd.code as owner_code',
      'COALESCE(d.trade_name, d.name) as owner_name',
    ])
    .orderBy(sortCol, sortDir)
    .offset(skip)
    .limit(limit)
    .getRawMany();

  return { page, limit, total, items };
}


  async findOne(auth: AuthUser, id: string) {
    const row = await this.warehouseRepo.findOne({
      where: {
        id: id as any,
        company_id: auth.company_id as any,
        deleted_at: IsNull(),
      } as any,
    });
    if (!row) throw new NotFoundException('Warehouse not found');
    return row;
  }

  async update(auth: AuthUser, id: string, dto: UpdateWarehouseDto) {
  const row = await this.findOne(auth, id);

  const nextOwnerType = dto.owner_type ?? row.owner_type;
  const nextOwnerId =
    dto.owner_id !== undefined ? (dto.owner_id ?? null) : row.owner_id;

  // validate if owner changes
  if (dto.owner_type !== undefined || dto.owner_id !== undefined) {
    await this.assertValidOwner(auth, nextOwnerType, nextOwnerId);
    row.owner_type = nextOwnerType;
    row.owner_id = nextOwnerId;
  }

  // handle default uniqueness
  if (dto.is_default === true) {
    await this.unsetOtherDefaults(auth, row.owner_type, row.owner_id, row.id);
    row.is_default = true;
  } else if (dto.is_default === false) {
    // allow unsetting default
    row.is_default = false;
  }

  // other fields...
  if (dto.code !== undefined && dto.code.trim() !== row.code) {
    const exists = await this.warehouseRepo.exist({
      where: {
        company_id: auth.company_id as any,
        code: dto.code.trim() as any,
        deleted_at: IsNull(),
      } as any,
    });
    if (exists) throw new ConflictException('Warehouse code already exists');
    row.code = dto.code.trim();
  }

  if (dto.name !== undefined) row.name = dto.name.trim();
  if (dto.address !== undefined) row.address = dto.address ?? null;
  if (dto.lat !== undefined) row.lat = dto.lat ?? null;
  if (dto.lng !== undefined) row.lng = dto.lng ?? null;
  if (dto.is_batch_tracked !== undefined) row.is_batch_tracked = dto.is_batch_tracked;
  if (dto.is_expiry_tracked !== undefined) row.is_expiry_tracked = dto.is_expiry_tracked;
  if (dto.effective_from !== undefined) row.effective_from = dto.effective_from ?? null;
  if (dto.effective_to !== undefined) row.effective_to = dto.effective_to ?? null;

  // status bookkeeping (same as before)
  if (dto.status !== undefined && dto.status !== row.status) {
    if (dto.status === Status.INACTIVE) {
      row.inactivated_at = new Date();
      row.inactivation_reason = dto.inactivation_reason ?? null;
    } else {
      row.inactivated_at = null;
      row.inactivation_reason = null;
    }
    row.status = dto.status;
  }

  row.updated_by = auth.user_id;
  return await this.warehouseRepo.save(row);
}


  async remove(auth: AuthUser, id: string) {
    const row = await this.findOne(auth, id);

    // soft delete
    row.deleted_at = new Date();
    row.deleted_by = auth.user_id;
    row.updated_by = auth.user_id;

    await this.warehouseRepo.save(row);
    return { id, deleted: true };
  }

  private async assertValidOwner(
  auth: { company_id: string },
  owner_type: number,
  owner_id: string | null | undefined,
) {
  if (owner_type === WarehouseOwnerType.COMPANY) {
    if (owner_id) throw new BadRequestException('For COMPANY warehouse, owner_id must be null');
    return;
  }

  if (!owner_id) {
    throw new BadRequestException('owner_id is required for DISTRIBUTOR/SUB_DISTRIBUTOR warehouse');
  }

  const dist = await this.distributorRepo.findOne({
    where: {
      id: owner_id as any,
      company_id: auth.company_id as any,
      deleted_at: IsNull(),
    } as any,
    select: ['id', 'status', 'distributor_type'] as any,
  });

  if (!dist) throw new BadRequestException('Invalid owner_id: distributor not found');

  if (dist.status !== Status.ACTIVE) {
    throw new BadRequestException('Owner distributor is inactive');
  }

  if (owner_type === WarehouseOwnerType.DISTRIBUTOR) {
    if (dist.distributor_type !== DistributorType.PRIMARY) {
      throw new BadRequestException('owner_id is not a PRIMARY distributor');
    }
    return;
  }

  if (owner_type === WarehouseOwnerType.SUB_DISTRIBUTOR) {
    if (dist.distributor_type !== DistributorType.SUB) {
      throw new BadRequestException('owner_id is not a SUB distributor');
    }
    return;
  }

  throw new BadRequestException('Invalid owner_type');
}
async makeDefault(auth: AuthUser, id: string) {
  const row = await this.findOne(auth, id);

  // unset others for same owner
  await this.unsetOtherDefaults(auth, row.owner_type, row.owner_id, row.id);

  // set this one default
  row.is_default = true;
  row.updated_by = auth.user_id;

  const saved = await this.warehouseRepo.save(row);
  return saved;
}

//update to make default
private async unsetOtherDefaults(
  auth: { company_id: string; user_id: string },
  owner_type: number,
  owner_id: string | null,
  exceptWarehouseId?: string,
) {
  const qb = this.warehouseRepo
    .createQueryBuilder()
    .update()
    .set({
      is_default: false,
      updated_by: auth.user_id as any,
      updated_at: () => 'NOW()',
    })
    .where('company_id = :company_id', { company_id: auth.company_id })
    .andWhere('deleted_at IS NULL')
    .andWhere('owner_type = :owner_type', { owner_type })
    .andWhere(owner_id === null ? 'owner_id IS NULL' : 'owner_id = :owner_id', {
      owner_id,
    })
    .andWhere('is_default = true');

  if (exceptWarehouseId) {
    qb.andWhere('id != :id', { id: exceptWarehouseId });
  }

  await qb.execute();
}

}
