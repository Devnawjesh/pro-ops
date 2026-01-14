// ==============================
// Route Service (full rewrite with effective dates + audit/inactivation fields)
// ==============================

// src/modules/master/route/route.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';

import { Route } from '../../org/entities/route.entity';
import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity';

import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { ListRouteDto } from './dto/list-route.dto';
import { Status } from '../../../common/constants/enums';

@Injectable()
export class RouteService {
  constructor(
    @InjectRepository(Route) private readonly repo: Repository<Route>,
    @InjectRepository(OrgHierarchy) private readonly orgRepo: Repository<OrgHierarchy>,
  ) {}

  // =========================================================
  // helpers
  // =========================================================

  private actorId(auth: any) {
    return auth?.user_id ?? auth?.sub ?? null;
  }

  private todayISODate() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private ensureEffectiveWindow(from?: string | null, to?: string | null) {
    if (from && to) {
      const f = new Date(from).getTime();
      const t = new Date(to).getTime();
      if (Number.isNaN(f) || Number.isNaN(t)) {
        throw new BadRequestException('Invalid effective dates');
      }
      if (f > t) {
        throw new BadRequestException('effective_from must be <= effective_to');
      }
    }
  }

  private normalizeCreateEffective(dto: { effective_from?: string | null; effective_to?: string | null }) {
    const effective_from = dto.effective_from ?? this.todayISODate(); // recommended default
    const effective_to = dto.effective_to ?? null;

    this.ensureEffectiveWindow(effective_from, effective_to);
    return { effective_from, effective_to };
  }

  private normalizeMergedEffective(
    current: { effective_from?: any; effective_to?: any },
    patch: { effective_from?: string | null; effective_to?: string | null },
  ) {
    const nextFrom =
      patch.effective_from !== undefined ? patch.effective_from : (current as any).effective_from ?? null;

    const nextTo =
      patch.effective_to !== undefined ? patch.effective_to : (current as any).effective_to ?? null;

    this.ensureEffectiveWindow(nextFrom, nextTo);
    return { effective_from: nextFrom, effective_to: nextTo };
  }

  private ensureDay0to6(day?: number | null) {
    if (day === null || day === undefined) return;
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      throw new BadRequestException('default_delivery_day must be between 0 and 6');
    }
  }

  private async ensureTerritory(auth: any, territory_id: string) {
    const territory = await this.orgRepo.findOne({
      where: { id: territory_id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!territory) throw new BadRequestException('Invalid territory_id');
    return territory;
  }

  // =========================================================
  // CRUD
  // =========================================================

  async create(auth: any, dto: CreateRouteDto) {
    const actor = this.actorId(auth);

    if (!dto.code?.trim()) throw new BadRequestException('code is required');
    if (!dto.name?.trim()) throw new BadRequestException('name is required');
    if (!dto.territory_id) throw new BadRequestException('territory_id is required');

    await this.ensureTerritory(auth, dto.territory_id);

    this.ensureDay0to6(dto.default_delivery_day ?? null);

    const { effective_from, effective_to } = this.normalizeCreateEffective(dto);

    const payload = {
      company_id: auth.company_id,
      code: dto.code.trim(),
      name: dto.name.trim(),
      territory_id: dto.territory_id,
      default_delivery_day: dto.default_delivery_day ?? null,
      is_delivery_route: dto.is_delivery_route ?? true,

      // ✅ lifecycle fields
      status: Status.ACTIVE,
      effective_from,
      effective_to,
      inactivated_at: null,
      inactivation_reason: null,

      // ✅ audit fields
      created_by: actor,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    } satisfies DeepPartial<Route>;

    const row = this.repo.create(payload);

    try {
      const saved = await this.repo.save(row);
      return saved;
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('Route code already exists');
      throw e;
    }
  }

  async list(auth: any, q: ListRouteDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoin(OrgHierarchy, 't', 't.id = r.territory_id')
      .where('r.company_id = :company_id', { company_id: auth.company_id })
      .andWhere('r.deleted_at IS NULL');

    if (q.status !== undefined) qb.andWhere('r.status = :status', { status: q.status });
    if (q.territory_id) qb.andWhere('r.territory_id = :territory_id', { territory_id: q.territory_id });

    if (q.is_delivery_route !== undefined) {
      qb.andWhere('r.is_delivery_route = :idr', { idr: q.is_delivery_route });
    }

    if (q.q?.trim()) {
      qb.andWhere('(r.code ILIKE :qq OR r.name ILIKE :qq)', { qq: `%${q.q.trim()}%` });
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'r.id AS id',
        'r.company_id AS company_id',
        'r.code AS code',
        'r.name AS name',
        'r.status AS status',
        'r.territory_id AS territory_id',
        'r.default_delivery_day AS default_delivery_day',
        'r.is_delivery_route AS is_delivery_route',

        // ✅ lifecycle fields
        'r.effective_from AS effective_from',
        'r.effective_to AS effective_to',
        'r.inactivated_at AS inactivated_at',
        'r.inactivation_reason AS inactivation_reason',

        // ✅ audit fields
        'r.created_by AS created_by',
        'r.updated_by AS updated_by',
        'r.deleted_at AS deleted_at',
        'r.deleted_by AS deleted_by',

        'r.created_at AS created_at',
        'r.updated_at AS updated_at',

        't.code AS territory_code',
        't.name AS territory_name',
      ])
      .orderBy('r.id', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, pages: Math.ceil(total / limit), rows };
  }

  async findOne(auth: any, id: string) {
    const row = await this.repo
      .createQueryBuilder('r')
      .leftJoin(OrgHierarchy, 't', 't.id = r.territory_id')
      .where('r.id = :id', { id })
      .andWhere('r.company_id = :company_id', { company_id: auth.company_id })
      .andWhere('r.deleted_at IS NULL')
      .select([
        'r.id AS id',
        'r.company_id AS company_id',
        'r.code AS code',
        'r.name AS name',
        'r.status AS status',
        'r.territory_id AS territory_id',
        'r.default_delivery_day AS default_delivery_day',
        'r.is_delivery_route AS is_delivery_route',

        'r.effective_from AS effective_from',
        'r.effective_to AS effective_to',
        'r.inactivated_at AS inactivated_at',
        'r.inactivation_reason AS inactivation_reason',

        'r.created_by AS created_by',
        'r.updated_by AS updated_by',
        'r.deleted_at AS deleted_at',
        'r.deleted_by AS deleted_by',

        'r.created_at AS created_at',
        'r.updated_at AS updated_at',

        't.code AS territory_code',
        't.name AS territory_name',
      ])
      .getRawOne();

    if (!row) throw new NotFoundException('Route not found');
    return row;
  }

  async update(auth: any, id: string, dto: UpdateRouteDto) {
    const actor = this.actorId(auth);

    const row = await this.repo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Route not found');

    const empty =
      dto.name === undefined &&
      dto.territory_id === undefined &&
      dto.default_delivery_day === undefined &&
      dto.is_delivery_route === undefined &&
      dto.status === undefined &&
      dto.effective_from === undefined &&
      dto.effective_to === undefined &&
      dto.inactivation_reason === undefined;

    if (empty) throw new BadRequestException('Empty payload');

    if (dto.territory_id !== undefined) {
      await this.ensureTerritory(auth, dto.territory_id);
      (row as any).territory_id = dto.territory_id;
    }

    if (dto.default_delivery_day !== undefined) {
      this.ensureDay0to6(dto.default_delivery_day ?? null);
      (row as any).default_delivery_day = dto.default_delivery_day ?? null;
    }

    if (dto.name !== undefined) (row as any).name = dto.name.trim();
    if (dto.is_delivery_route !== undefined) (row as any).is_delivery_route = dto.is_delivery_route;

    // ✅ effective window validate merged final values
    const mergedEff = this.normalizeMergedEffective(row as any, dto as any);
    if (dto.effective_from !== undefined) (row as any).effective_from = mergedEff.effective_from;
    if (dto.effective_to !== undefined) (row as any).effective_to = mergedEff.effective_to;

    // ✅ status -> inactivation fields
    if (dto.status !== undefined) {
      const prev = (row as any).status;

      (row as any).status = dto.status;

      // If turning inactive: set inactivated_at & reason
      if (dto.status === Status.INACTIVE && prev !== Status.INACTIVE) {
        (row as any).inactivated_at = new Date();
        (row as any).inactivation_reason = dto.inactivation_reason ?? (row as any).inactivation_reason ?? null;
      }

      // If re-activating: clear inactivation fields
      if (dto.status === Status.ACTIVE && prev !== Status.ACTIVE) {
        (row as any).inactivated_at = null;
        (row as any).inactivation_reason = null;
      }
    } else {
      // if status not sent, allow only updating reason when currently inactive
      if (dto.inactivation_reason !== undefined) {
        if ((row as any).status !== Status.INACTIVE) {
          throw new BadRequestException('inactivation_reason can be set only when status is INACTIVE');
        }
        (row as any).inactivation_reason = dto.inactivation_reason ?? null;
      }
    }

    (row as any).updated_by = actor;

    try {
      const saved = await this.repo.save(row);
      return saved;
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('Route code already exists');
      throw e;
    }
  }

  async remove(auth: any, id: string) {
    const actor = this.actorId(auth);

    const row = await this.repo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Route not found');

    (row as any).deleted_at = new Date();
    (row as any).deleted_by = actor;

    return await this.repo.save(row);
  }

  async listByWeekday(auth: any, day: number) {
    this.ensureDay0to6(day);

    const rows = await this.repo
      .createQueryBuilder('r')
      .leftJoin(OrgHierarchy, 't', 't.id = r.territory_id')
      .where('r.company_id = :company_id', { company_id: auth.company_id })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.status = :st', { st: Status.ACTIVE })
      .andWhere('r.is_delivery_route = true')
      .andWhere('r.default_delivery_day = :day', { day })
      .select([
        'r.id AS id',
        'r.code AS code',
        'r.name AS name',
        'r.territory_id AS territory_id',
        't.code AS territory_code',
        't.name AS territory_name',
      ])
      .orderBy('t.name', 'ASC')
      .addOrderBy('r.name', 'ASC')
      .getRawMany();

    return rows;
  }
}
