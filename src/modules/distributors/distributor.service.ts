// src/modules/master/distributor/distributor.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder,DataSource, In } from 'typeorm';

import { MdDistributor } from '../distributors/entities/distributor.entity';
import { CreateDistributorDto } from './dto/create-distributor.dto';
import { UpdateDistributorDto } from './dto/update-distributor.dto';
import { ListDistributorDto } from './dto/list-distributor.dto';
import { OrgHierarchy } from 'src/modules/org/entities/org-hierarchy.entity';

import { DistributorType, Status, UserType,ScopeType,OrgLevel } from 'src/common/constants/enums';

type AuthUser = {
  company_id: string;
  user_type?: number;

  // recommended to attach these in jwt / guard
  distributor_id?: string;      // for DISTRIBUTOR_USER
  sub_distributor_id?: string;  // for SUB_DISTRIBUTOR_USER

  sub?: string;
  id?: string;
};

@Injectable()
export class DistributorService {
  constructor(
    @InjectRepository(MdDistributor) private readonly repo: Repository<MdDistributor>,
    private readonly dataSource: DataSource,
  ) {}

  // -------------------------
  // helpers
  // -------------------------
  private actorId(auth: AuthUser): string | null {
    return (auth?.sub ?? auth?.id ?? null) as any;
  }
private hasGlobalScope(auth: any) {
    return (auth.scopes ?? []).some((s: any) => Number(s.scope_type) === ScopeType.GLOBAL);
  }
  private normalizeCode(code: string) {
    return code.trim();
  }

  private normalizeText(v?: string | null) {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const t = v.trim();
    return t.length ? t : null;
  }

  private assertEffectiveDates(dto: { effective_from?: string | null; effective_to?: string | null }) {
    if (!dto.effective_from || !dto.effective_to) return;
    if (dto.effective_from > dto.effective_to) {
      throw new BadRequestException('effective_from cannot be after effective_to');
    }
  }

  private async assertCodeUnique(company_id: string, code: string, ignoreId?: string) {
    const qb = this.repo
      .createQueryBuilder('d')
      .select('d.id', 'id')
      .where('d.company_id = :company_id', { company_id })
      .andWhere('d.code = :code', { code });

    if (ignoreId) qb.andWhere('d.id <> :ignoreId', { ignoreId });

    const exists = await qb.getRawOne();
    if (exists) throw new ConflictException('Distributor code already exists');
  }

  private async assertParentValid(
    auth: AuthUser,
    dto: { distributor_type: number; parent_distributor_id?: string | null },
  ) {
    const type = dto.distributor_type;

    if (type === DistributorType.SUB) {
      if (!dto.parent_distributor_id) {
        throw new BadRequestException('parent_distributor_id is required for SUB distributor');
      }
      const parent = await this.repo.findOne({
        where: {
          id: dto.parent_distributor_id as any,
          company_id: auth.company_id as any,
          distributor_type: DistributorType.PRIMARY as any,
          status: Status.ACTIVE as any,
          deleted_at: null as any,
        } as any,
      });
      if (!parent) throw new BadRequestException('Invalid parent_distributor_id (must be ACTIVE PRIMARY)');
    }

    if (type === DistributorType.PRIMARY && dto.parent_distributor_id) {
      throw new BadRequestException('PRIMARY distributor cannot have parent_distributor_id');
    }
  }

  /**
   * Visibility filter (very important)
   * - EMPLOYEE: all
   * - DISTRIBUTOR_USER: own primary + its sub distributors
   * - SUB_DISTRIBUTOR_USER: only itself (optionally parent if you want)
   */
  private applyVisibility(
    qb: SelectQueryBuilder<MdDistributor>,
    auth: AuthUser,
  ) {
    qb.andWhere('d.company_id = :company_id', { company_id: auth.company_id });

    // Only hide deleted by default
    qb.andWhere('d.deleted_at IS NULL');

    // If user_type is missing => treat as employee/admin
    const ut = auth.user_type;

    if (ut === UserType.DISTRIBUTOR_USER) {
      if (!auth.distributor_id) {
        throw new BadRequestException('Missing distributor_id in auth context');
      }
      // primary itself OR its children subs
      qb.andWhere('(d.id = :did OR d.parent_distributor_id = :did)', {
        did: auth.distributor_id,
      });
      return;
    }

    if (ut === UserType.SUB_DISTRIBUTOR_USER) {
      if (!auth.sub_distributor_id) {
        throw new BadRequestException('Missing sub_distributor_id in auth context');
      }
      qb.andWhere('d.id = :sid', { sid: auth.sub_distributor_id });

      // OPTIONAL: if you want sub-distributor to also see parent primary, uncomment:
      // qb.orWhere('d.id = (SELECT parent_distributor_id FROM md_distributor WHERE id = :sid)', { sid: auth.sub_distributor_id });

      return;
    }

    // EMPLOYEE or anything else => no extra restriction
  }

  private baseListQuery(auth: AuthUser) {
    if (!auth?.company_id) throw new BadRequestException('Invalid auth context');
    const qb = this.repo.createQueryBuilder('d');
    this.applyVisibility(qb, auth);
    return qb;
  }

  private async findOrFail(auth: AuthUser, id: string) {
    const qb = this.repo.createQueryBuilder('d').where('d.id = :id', { id });
    this.applyVisibility(qb, auth);

    const row = await qb.getOne();
    if (!row) throw new NotFoundException('Distributor not found');
    return row;
  }

  // -------------------------
  // commands
  // -------------------------
  async create(auth: AuthUser, dto: CreateDistributorDto) {
    dto.code = this.normalizeCode(dto.code);
    this.assertEffectiveDates(dto);

    await this.assertCodeUnique(auth.company_id, dto.code);
    await this.assertParentValid(auth, dto);

    const actor = this.actorId(auth);

    const row = this.repo.create({
      company_id: auth.company_id,
      code: dto.code,
      name: dto.name.trim(),

      distributor_type: dto.distributor_type,
      parent_distributor_id: dto.parent_distributor_id ?? null,

      trade_name: this.normalizeText(dto.trade_name) ?? null,
      owner_name: this.normalizeText(dto.owner_name) ?? null,
      mobile: this.normalizeText(dto.mobile) ?? null,
      email: this.normalizeText(dto.email) ?? null,
      address: this.normalizeText(dto.address) ?? null,

      credit_limit: dto.credit_limit ?? '0',
      payment_terms_days: dto.payment_terms_days ?? 0,

      vat_registration_no: this.normalizeText(dto.vat_registration_no) ?? null,
      tin_no: this.normalizeText(dto.tin_no) ?? null,
      erp_partner_id: this.normalizeText(dto.erp_partner_id) ?? null,

      effective_from: dto.effective_from ?? null,
      effective_to: dto.effective_to ?? null,

      status: Status.ACTIVE,
      created_by: actor,
      updated_by: actor,
    } as any);

    try {
      return await this.repo.save(row);
    } catch (e: any) {
      if (String(e?.code) === '23505') throw new ConflictException('Distributor code already exists');
      throw e;
    }
  }

  async list(auth: AuthUser, q: ListDistributorDto) {
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    const qb = this.baseListQuery(auth);

    // filters
    if (!q.include_inactive && q.status === undefined) {
      qb.andWhere('d.status = :active', { active: Status.ACTIVE });
    }
    if (q.status !== undefined) qb.andWhere('d.status = :status', { status: q.status });

    if (q.distributor_type !== undefined) qb.andWhere('d.distributor_type = :dt', { dt: q.distributor_type });
    if (q.parent_distributor_id) qb.andWhere('d.parent_distributor_id = :pid', { pid: q.parent_distributor_id });

    // effective filter (default true)
    if (q.is_effective !== false) {
      qb.andWhere('(d.effective_from IS NULL OR d.effective_from <= CURRENT_DATE)')
        .andWhere('(d.effective_to IS NULL OR d.effective_to >= CURRENT_DATE)');
    }

    // search
    if (q.q?.trim()) {
      const term = `%${q.q.trim()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('d.code ILIKE :term', { term })
            .orWhere('d.name ILIKE :term', { term })
            .orWhere('d.trade_name ILIKE :term', { term })
            .orWhere('d.mobile ILIKE :term', { term })
            .orWhere('d.email ILIKE :term', { term });
        }),
      );
    }

    const sort = q.sort ?? 'id';
    const order = q.order ?? 'DESC';
    qb.orderBy(`d.${sort}`, order).skip(skip).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { page, limit, total, rows };
  }

  async findOne(auth: AuthUser, id: string) {
    return this.findOrFail(auth, id);
  }

  async update(auth: AuthUser, id: string, dto: UpdateDistributorDto) {
    const row = await this.findOrFail(auth, id);

    if (dto.code !== undefined) dto.code = this.normalizeCode(dto.code);
    if (dto.name !== undefined) dto.name = dto.name.trim() as any;
    this.assertEffectiveDates(dto);

    // unique check
    if (dto.code && dto.code !== row.code) {
      await this.assertCodeUnique(auth.company_id, dto.code, id);
    }

    // validate parent/type if changed
    if (dto.distributor_type !== undefined || dto.parent_distributor_id !== undefined) {
      await this.assertParentValid(auth, {
        distributor_type: dto.distributor_type ?? row.distributor_type,
        parent_distributor_id: dto.parent_distributor_id ?? row.parent_distributor_id,
      });
    }

    // apply
    if (dto.code !== undefined) row.code = dto.code as any;
    if (dto.name !== undefined) row.name = dto.name as any;

    if (dto.distributor_type !== undefined) row.distributor_type = dto.distributor_type as any;
    if (dto.parent_distributor_id !== undefined)
      row.parent_distributor_id = dto.parent_distributor_id ?? null;

    if (dto.trade_name !== undefined) row.trade_name = this.normalizeText(dto.trade_name) ?? null;
    if (dto.owner_name !== undefined) row.owner_name = this.normalizeText(dto.owner_name) ?? null;
    if (dto.mobile !== undefined) row.mobile = this.normalizeText(dto.mobile) ?? null;
    if (dto.email !== undefined) row.email = this.normalizeText(dto.email) ?? null;
    if (dto.address !== undefined) row.address = this.normalizeText(dto.address) ?? null;

    if (dto.credit_limit !== undefined) row.credit_limit = dto.credit_limit as any;
    if (dto.payment_terms_days !== undefined) row.payment_terms_days = dto.payment_terms_days as any;

    if (dto.vat_registration_no !== undefined)
      row.vat_registration_no = this.normalizeText(dto.vat_registration_no) ?? null;
    if (dto.tin_no !== undefined) row.tin_no = this.normalizeText(dto.tin_no) ?? null;
    if (dto.erp_partner_id !== undefined) row.erp_partner_id = this.normalizeText(dto.erp_partner_id) ?? null;

    if (dto.status !== undefined) row.status = dto.status as any;

    if (dto.effective_from !== undefined) row.effective_from = dto.effective_from ?? null;
    if (dto.effective_to !== undefined) row.effective_to = dto.effective_to ?? null;

    row.updated_by = this.actorId(auth);

    try {
      return await this.repo.save(row);
    } catch (e: any) {
      if (String(e?.code) === '23505') throw new ConflictException('Distributor code already exists');
      throw e;
    }
  }

  async inactivate(auth: AuthUser, id: string, reason?: string) {
    const row = await this.findOrFail(auth, id);

    row.status = Status.INACTIVE;
    row.inactivated_at = new Date();
    row.inactivation_reason = this.normalizeText(reason ?? null);
    row.updated_by = this.actorId(auth);

    return this.repo.save(row);
  }

  async activate(auth: AuthUser, id: string) {
    const row = await this.findOrFail(auth, id);

    row.status = Status.ACTIVE;
    row.inactivated_at = null;
    row.inactivation_reason = null;
    row.updated_by = this.actorId(auth);

    return this.repo.save(row);
  }
  private async resolveAllowedTerritoryNodeIds(auth: any): Promise<string[] | null> {
    if (this.hasGlobalScope(auth)) return null; // null = no restriction

    const company_id = auth.company_id;
    const scopes = auth.scopes ?? [];

    // Distributor users: no need org nodes
    if (auth.user_type === UserType.DISTRIBUTOR_USER) return []; // handled separately
    if (auth.user_type === UserType.SUB_DISTRIBUTOR_USER) return []; // handled separately

    const hierarchyNodeIds = scopes
      .filter((s: any) => Number(s.scope_type) === ScopeType.HIERARCHY && s.org_node_id)
      .map((s: any) => String(s.org_node_id));

    const routeTerritoryIds = scopes
      .filter((s: any) => Number(s.scope_type) === ScopeType.ROUTE && s.route_id)
      .map((s: any) => String(s.route_id));

    // If you support ROUTE scope, you must map route_id -> territory_id (you already have Route entity)
    // We'll do it inside query below.

    if (!hierarchyNodeIds.length && !routeTerritoryIds.length) return []; // nothing allowed

    // Resolve descendant territories using path
    // 1) find base paths for hierarchy nodes
    const nodeRows = await this.dataSource
      .getRepository(OrgHierarchy)
      .createQueryBuilder('n')
      .select(['n.id AS id', 'n.path AS path'])
      .where('n.company_id=:cid', { cid: company_id })
      .andWhere('n.deleted_at IS NULL')
      .andWhere('n.id IN (:...ids)', { ids: hierarchyNodeIds.length ? hierarchyNodeIds : ['-1'] })
      .getRawMany();

    const paths = nodeRows.map((r: any) => r.path ?? `/${r.id}/`);

    // 2) descendant territories
    const terrQb = this.dataSource
      .getRepository(OrgHierarchy)
      .createQueryBuilder('t')
      .select(['t.id AS id'])
      .where('t.company_id=:cid', { cid: company_id })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('t.level_no = :lvl', { lvl: OrgLevel.TERRITORY });

    if (paths.length) {
      terrQb.andWhere(
        new Brackets((b) => {
          for (let i = 0; i < paths.length; i++) {
            b.orWhere('t.path LIKE :p' + i, { ['p' + i]: `${paths[i]}%` });
          }
        }),
      );
    } else {
      terrQb.andWhere('1=0');
    }

    const territories = await terrQb.getRawMany();
    const territoryIds = territories.map((x: any) => String(x.id));

    // TODO (optional): route scope -> territory_id (if routeTerritoryIds present)
    // If needed, I’ll paste that too, but keeping this focused.

    return territoryIds;
  }
 async listVisibleDistributors(auth: any, q: ListDistributorDto) {
    const company_id = auth.company_id;

    // Distributor user logic: self + subs (your existing applyVisibility already does this)
    if (auth.user_type === UserType.DISTRIBUTOR_USER || auth.user_type === UserType.SUB_DISTRIBUTOR_USER) {
      return this.list(auth, q);
    }

    // Employee logic:
    const territoryIdsOrNull = await this.resolveAllowedTerritoryNodeIds(auth);

    const qb = this.repo.createQueryBuilder('d')
      .where('d.company_id=:cid', { cid: company_id })
      .andWhere('d.deleted_at IS NULL');

    // status/effective/search filters can be same as your existing list()
    if (!q.include_inactive && q.status === undefined) qb.andWhere('d.status=:s', { s: Status.ACTIVE });
    if (q.status !== undefined) qb.andWhere('d.status=:s', { s: q.status });

    if (q.q?.trim()) {
      const term = `%${q.q.trim()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('d.code ILIKE :term', { term })
            .orWhere('d.name ILIKE :term', { term })
            .orWhere('d.trade_name ILIKE :term', { term })
            .orWhere('d.mobile ILIKE :term', { term })
            .orWhere('d.email ILIKE :term', { term });
        }),
      );
    }

    // ✅ Apply hierarchy restriction (if not global)
    if (territoryIdsOrNull !== null) {
      if (!territoryIdsOrNull.length) {
        return { page: q.page ?? 1, limit: q.limit ?? 20, total: 0, rows: [] };
      }

      qb.innerJoin(
        'md_distributor_org_node',
        'm',
        'm.company_id = d.company_id AND m.distributor_id = d.id AND m.deleted_at IS NULL',
      )
      .andWhere('m.org_node_id IN (:...tids)', { tids: territoryIdsOrNull });
    }

    // pagination/sort
    const page = q.page ?? 1;
    const limit = Math.min(q.limit ?? 20, 200);
    const skip = (page - 1) * limit;

    qb.orderBy('d.id', 'DESC').skip(skip).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { page, limit, total, rows };
  }
}
