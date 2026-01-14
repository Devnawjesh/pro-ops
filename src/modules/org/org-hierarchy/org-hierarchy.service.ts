// src/modules/master/org-hierarchy/org-hierarchy.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, In, Repository } from 'typeorm';

import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity';
import { Route } from '../../org/entities/route.entity';

import { CreateOrgNodeDto } from './dto/create-org-node.dto';
import { UpdateOrgNodeDto } from './dto/update-org-node.dto';
import { ListOrgNodeDto } from './dto/list-org-node.dto';
import { BulkImportOrgDto, BulkOrgRowDto } from './dto/bulk-import-org.dto';
import { OrgTreeQueryDto } from './dto/tree-org.dto';

import { OrgLevel,Status } from '../../../common/constants/enums';
import { MdDistributorOrgNode } from 'src/modules/distributors/entities/md_distributor_org_node.entity';

@Injectable()
export class OrgHierarchyService {
  constructor(
    @InjectRepository(OrgHierarchy)
    private readonly repo: Repository<OrgHierarchy>,
    private readonly dataSource: DataSource,
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
  ) {}

  // =========================================================
  // Effective date helpers
  // =========================================================

  private todayISODate() {
    return new Date().toISOString().slice(0, 10);
  }

  private ensureEffectiveWindow(from?: string | null, to?: string | null) {
    if (from && to) {
      const f = new Date(from).getTime();
      const t = new Date(to).getTime();
      if (Number.isNaN(f) || Number.isNaN(t)) throw new BadRequestException('Invalid effective dates');
      if (f > t) throw new BadRequestException('effective_from must be <= effective_to');
    }
  }

   private normalizeCreateEffective(dto: { effective_from?: string | null; effective_to?: string | null }) {
    const effective_from = dto.effective_from ?? this.todayISODate();
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

 private actorId(auth: any): string | null {
    return String(auth?.user_id ?? auth?.sub ?? auth?.id ?? '') || null;
  }

  private async setPathAfterCreateTx(
    repo: Repository<OrgHierarchy>,
    company_id: string,
    nodeId: string,
  ) {
    const node = await repo.findOne({ where: { id: nodeId as any, company_id: company_id as any, deleted_at: null as any } as any });
    if (!node) return;

    let newPath = `/${(node as any).id}/`;
    if ((node as any).parent_id) {
      const parent = await repo.findOne({
        where: { id: (node as any).parent_id as any, company_id: company_id as any, deleted_at: null as any } as any,
      });
      const parentPath = (parent as any)?.path ?? `/${(node as any).parent_id}/`;
      newPath = `${parentPath}${(node as any).id}/`;
    }

    if ((node as any).path !== newPath) {
      (node as any).path = newPath;
      await repo.save(node);
    }
  }
// =========================================================
  // FULL CREATE
  // =========================================================
  async create(auth: any, dto: CreateOrgNodeDto) {
    const company_id = String(auth?.company_id ?? '');
    if (!company_id) throw new BadRequestException('Invalid auth context (company_id missing)');

    const actor = this.actorId(auth);

    // ---------- basic validations ----------
    if (!dto.code?.trim()) throw new BadRequestException('code is required');
    if (!dto.name?.trim()) throw new BadRequestException('name is required');
    if (!dto.level_no) throw new BadRequestException('level_no is required');

    const code = dto.code.trim();
    const name = dto.name.trim();

    // ---------- effective defaults + validation ----------
    const { effective_from, effective_to } = this.normalizeCreateEffective(dto);

    // ---------- distributor_ids normalization ----------
    const distributor_ids = (dto as any).distributor_ids as string[] | undefined;
    const distIds = (distributor_ids ?? []).map(String).map((x) => x.trim()).filter(Boolean);

    // ---------- transaction ----------
    return this.dataSource.transaction(async (manager) => {
      const orgRepo = manager.getRepository(OrgHierarchy);
      const mapRepo = manager.getRepository(MdDistributorOrgNode);

      // unique check (company+code)
      const exists = await orgRepo.findOne({
        where: { company_id: company_id as any, code: code as any, deleted_at: null as any } as any,
      });
      if (exists) throw new ConflictException('Org node code already exists');

      // parent validation
      let parent_id: string | null = dto.parent_id ? String(dto.parent_id) : null;
      if (parent_id) {
        const parent = await orgRepo.findOne({
          where: { id: parent_id as any, company_id: company_id as any, deleted_at: null as any } as any,
        });
        if (!parent) throw new BadRequestException('Invalid parent_id');
      }

      // create node
      const payload: DeepPartial<OrgHierarchy> = {
        company_id: company_id as any,
        code,
        name,
        level_no: dto.level_no as any,
        parent_id: parent_id as any,
        path: null,
        sort_order: dto.sort_order ?? 0,
        effective_from,
        effective_to,
        created_by: actor as any,
        updated_by: actor as any,
      };

      let saved: OrgHierarchy;
      try {
        const node = orgRepo.create(payload);
        saved = await orgRepo.save(node);
      } catch (e: any) {
        if (String(e?.code) === '23505') throw new ConflictException('Org node code already exists');
        throw e;
      }

      // build path
      await this.setPathAfterCreateTx(orgRepo, company_id, String((saved as any).id));

      // assign distributors (only for TERRITORY)
      if (distIds.length) {
        if (Number(dto.level_no) !== OrgLevel.TERRITORY) {
          throw new BadRequestException('distributor_ids can only be assigned for TERRITORY nodes');
        }

        // Insert mappings; ignore duplicates
        await mapRepo
          .createQueryBuilder()
          .insert()
          .into(MdDistributorOrgNode)
          .values(
            distIds.map((did) => ({
              company_id: company_id as any,
              distributor_id: did as any,
              org_node_id: String((saved as any).id) as any,
              created_by: actor as any,
              updated_by: actor as any,
            })),
          )
          .orIgnore()
          .execute();
      }

      // return fresh row (with updated path)
      const finalRow = await orgRepo.findOne({
        where: { id: (saved as any).id, company_id: company_id as any, deleted_at: null as any } as any,
      });

      return finalRow ?? saved;
    });
  }

  async list(auth: any, q: ListOrgNodeDto) {
    const company_id = auth.company_id;

    const page = q.page ?? 1;
    const limit = q.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('n')
      .leftJoin(OrgHierarchy, 'p', 'p.id = n.parent_id')
      .where('n.company_id = :company_id', { company_id })
      .andWhere('n.deleted_at IS NULL');

    if (q.status !== undefined) qb.andWhere('n.status = :status', { status: q.status });
    if (q.level_no !== undefined) qb.andWhere('n.level_no = :level_no', { level_no: q.level_no });
    if (q.parent_id) qb.andWhere('n.parent_id = :parent_id', { parent_id: q.parent_id });

    if (q.q?.trim()) {
      qb.andWhere('(n.code ILIKE :qq OR n.name ILIKE :qq)', { qq: `%${q.q.trim()}%` });
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'n.id AS id',
        'n.company_id AS company_id',
        'n.code AS code',
        'n.name AS name',
        'n.status AS status',
        'n.level_no AS level_no',
        'n.parent_id AS parent_id',
        'n.path AS path',
        'n.sort_order AS sort_order',
        'n.effective_from AS effective_from',
        'n.effective_to AS effective_to',
        'n.created_at AS created_at',
        'n.updated_at AS updated_at',
        'p.code AS parent_code',
        'p.name AS parent_name',
      ])
      .orderBy('n.level_no', 'ASC')
      .addOrderBy('n.sort_order', 'ASC')
      .addOrderBy('n.id', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, rows, pages: Math.ceil(total / limit) };
  }

  async findOne(auth: any, id: string) {
    const company_id = auth.company_id;

    const row = await this.repo
      .createQueryBuilder('n')
      .leftJoin(OrgHierarchy, 'p', 'p.id = n.parent_id')
      .where('n.id = :id', { id })
      .andWhere('n.company_id = :company_id', { company_id })
      .andWhere('n.deleted_at IS NULL')
      .select([
        'n.id AS id',
        'n.company_id AS company_id',
        'n.code AS code',
        'n.name AS name',
        'n.status AS status',
        'n.level_no AS level_no',
        'n.parent_id AS parent_id',
        'n.path AS path',
        'n.sort_order AS sort_order',
        'n.effective_from AS effective_from',
        'n.effective_to AS effective_to',
        'n.created_at AS created_at',
        'n.updated_at AS updated_at',
        'p.code AS parent_code',
        'p.name AS parent_name',
      ])
      .getRawOne();

    if (!row) throw new NotFoundException('Org node not found');
    return row;
  }

  async update(auth: any, id: string, dto: UpdateOrgNodeDto) {
    const company_id = auth.company_id;
    const actor = auth.user_id ?? auth.sub ?? null;

    const row = await this.repo.findOne({
      where: { id, company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Org node not found');

    const emptyPayload =
      dto.name === undefined &&
      dto.level_no === undefined &&
      dto.parent_id === undefined &&
      dto.path === undefined &&
      dto.sort_order === undefined &&
      dto.status === undefined &&
      dto.effective_from === undefined &&
      dto.effective_to === undefined;

    if (emptyPayload) throw new BadRequestException('Empty payload');

    const parentChanged =
      dto.parent_id !== undefined && (dto.parent_id ?? null) !== ((row as any).parent_id ?? null);

    // parent validation
    if (dto.parent_id !== undefined) {
      if (dto.parent_id === null) {
        (row as any).parent_id = null;
      } else {
        const parent = await this.repo.findOne({
          where: { id: dto.parent_id, company_id, deleted_at: null } as any,
        });
        if (!parent) throw new BadRequestException('Invalid parent_id');
        if (dto.parent_id === (row as any).id) throw new BadRequestException('parent_id cannot be self');
        (row as any).parent_id = dto.parent_id;
      }
    }

    if (dto.name !== undefined) (row as any).name = dto.name.trim();
    if (dto.level_no !== undefined) (row as any).level_no = dto.level_no;
    // IMPORTANT: do not allow client-controlled path updates
    if (dto.sort_order !== undefined) (row as any).sort_order = dto.sort_order ?? 0;
    if (dto.status !== undefined) (row as any).status = dto.status;

    // ✅ effective window: validate merged final values, then assign
    const mergedEff = this.normalizeMergedEffective(row as any, dto as any);
    if (dto.effective_from !== undefined) (row as any).effective_from = mergedEff.effective_from;
    if (dto.effective_to !== undefined) (row as any).effective_to = mergedEff.effective_to;

    (row as any).updated_by = actor;

    try {
      const saved = await this.repo.save(row);

      if (parentChanged) {
        await this.rebuildPathSubtree(company_id, (row as any).id, this.repo);
      }

      return { success: true, message: 'OK', data: { id: (saved as any).id } };
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('Org node code already exists');
      throw e;
    }
  }

  async remove(auth: any, id: string) {
    const company_id = auth.company_id;
    const actor = auth.user_id ?? auth.sub ?? null;

    const row = await this.repo.findOne({
      where: { id, company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Org node not found');

    (row as any).deleted_at = new Date();
    (row as any).deleted_by = actor;

    return await this.repo.save(row);
  }

  // =========================================================
  // Bulk import (upsert + path)
  // =========================================================

  private ensureImportOrder(rows: BulkOrgRowDto[]) {
    const order = new Map<number, number>([
      [OrgLevel.HOS, 1],
      [OrgLevel.DIV, 2],
      [OrgLevel.REGION, 3],
      [OrgLevel.AREA, 4],
      [OrgLevel.TERRITORY, 5],
    ]);
    return [...rows].sort(
      (a, b) => (order.get(a.level_no) ?? 99) - (order.get(b.level_no) ?? 99),
    );
  }

  async bulkImport(auth: any, dto: BulkImportOrgDto) {
    const company_id = auth.company_id;
    const actor = auth.user_id ?? auth.sub ?? null;

    if (!dto.rows?.length) throw new BadRequestException('rows is required');

    // validate duplicates inside payload
    const seen = new Set<string>();
    for (const r of dto.rows) {
      const code = (r.code ?? '').trim();
      if (!code) throw new BadRequestException('Each row.code is required');
      if (seen.has(code)) throw new BadRequestException(`Duplicate code in payload: ${code}`);
      seen.add(code);
    }

    const rows = this.ensureImportOrder(dto.rows);

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(OrgHierarchy) as Repository<OrgHierarchy>;

      const allCodes = rows.map((r) => r.code.trim());
      const existing = await repo.find({
        where: { company_id, code: In(allCodes), deleted_at: null } as any,
      });

      const byCode = new Map<string, OrgHierarchy>(existing.map((x) => [String((x as any).code), x]));

      // preload parents by parent_code
      const parentCodes = rows
        .map((r) => (r.parent_code ?? '').trim())
        .filter((x) => !!x);

      if (parentCodes.length) {
        const parents = await repo.find({
          where: { company_id, code: In(parentCodes), deleted_at: null } as any,
        });
        for (const p of parents) byCode.set(String((p as any).code), p);
      }

      const created: Array<{ id: string; code: string }> = [];
      const updated: Array<{ id: string; code: string }> = [];
      const failed: Array<{ code: string; error: string }> = [];

      for (const r of rows) {
        const code = r.code.trim();
        const name = (r.name ?? '').trim();

        if (!name) {
          failed.push({ code, error: 'name is required' });
          continue;
        }

        // resolve parent_id
        let parent_id: string | null = null;
        if (r.parent_id) parent_id = r.parent_id;
        else if (r.parent_code) {
          const p = byCode.get(r.parent_code.trim());
          if (!p) {
            failed.push({ code, error: `parent_code not found: ${r.parent_code}` });
            continue;
          }
          parent_id = (p as any).id;
        }

        const exists = byCode.get(code);

        // --------------------
        // UPDATE
        // --------------------
        if (exists) {
          if (!dto.upsert) {
            failed.push({ code, error: 'code already exists (upsert=false)' });
            continue;
          }

          const parentChanged = ((exists as any).parent_id ?? null) !== (parent_id ?? null);

          // ✅ effective window (merged)
          const mergedEff = this.normalizeMergedEffective(exists as any, {
            effective_from: r.effective_from,
            effective_to: r.effective_to,
          });

          (exists as any).name = name;
          (exists as any).level_no = r.level_no;
          (exists as any).parent_id = parent_id;
          (exists as any).sort_order = r.sort_order ?? 0;
          (exists as any).effective_from = mergedEff.effective_from;
          (exists as any).effective_to = mergedEff.effective_to;
          (exists as any).updated_by = actor;

          try {
            await repo.save(exists);

            if (parentChanged) {
              await this.rebuildPathSubtree(company_id, (exists as any).id, repo);
            }

            updated.push({ id: String((exists as any).id), code });
            byCode.set(code, exists);
          } catch (e: any) {
            if (e?.code === '23505') failed.push({ code, error: 'unique violation (code)' });
            else failed.push({ code, error: e?.message ?? 'unknown error' });
          }

          continue;
        }

        // --------------------
        // CREATE
        // --------------------
        const effective_from = r.effective_from ?? this.todayISODate();
        const effective_to = r.effective_to ?? null;

        try {
          this.ensureEffectiveWindow(effective_from, effective_to);

          const payload = {
            company_id,
            code,
            name,
            level_no: r.level_no,
            parent_id,
            path: null,
            sort_order: r.sort_order ?? 0,
            effective_from,
            effective_to,
            created_by: actor,
          } satisfies DeepPartial<OrgHierarchy>;

          const node = repo.create(payload);
          const saved = await repo.save(node);

          await this.setPathAfterCreate(repo, company_id, (saved as any).id);

          created.push({ id: String((saved as any).id), code });
          byCode.set(code, saved);
        } catch (e: any) {
          if (e?.code === '23505') failed.push({ code, error: 'unique violation (code)' });
          else failed.push({ code, error: e?.message ?? 'unknown error' });
        }
      }

      return { created, updated, failed };
    });
  }

  // =========================================================
  // Tree + routes helpers
  // =========================================================

  async getTree(auth: any, q: OrgTreeQueryDto) {
    const company_id = auth.company_id;

    let rootPath: string | null = null;
    if (q.root_id) {
      const root = await this.repo.findOne({
        where: { id: q.root_id, company_id, deleted_at: null } as any,
      });
      if (!root) throw new NotFoundException('root_id not found');
      rootPath = (root as any).path ?? `/${(root as any).id}/`;
    }

    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.company_id = :company_id', { company_id })
      .andWhere('n.deleted_at IS NULL');

    if (rootPath) qb.andWhere('n.path LIKE :p', { p: `${rootPath}%` });
    if (q.level_no !== undefined) qb.andWhere('n.level_no <= :lvl', { lvl: q.level_no });

    const rows = await qb
      .select([
        'n.id AS id',
        'n.code AS code',
        'n.name AS name',
        'n.level_no AS level_no',
        'n.parent_id AS parent_id',
        'n.sort_order AS sort_order',
        'n.path AS path',
        'n.effective_from AS effective_from',
        'n.effective_to AS effective_to',
      ])
      .orderBy('n.level_no', 'ASC')
      .addOrderBy('n.sort_order', 'ASC')
      .addOrderBy('n.id', 'ASC')
      .getRawMany();

    const byId = new Map<string, any>();
    for (const r of rows) byId.set(r.id, { ...r, children: [] });

    const roots: any[] = [];
    for (const node of byId.values()) {
      if (node.parent_id && byId.has(node.parent_id)) byId.get(node.parent_id).children.push(node);
      else roots.push(node);
    }

    if (q.include_routes) {
      const territoryIds = rows
        .filter((x: any) => Number(x.level_no) === OrgLevel.TERRITORY)
        .map((x: any) => x.id);

      if (territoryIds.length) {
        const routes = await this.routeRepo
          .createQueryBuilder('r')
          .where('r.company_id = :company_id', { company_id })
          .andWhere('r.deleted_at IS NULL')
          .andWhere('r.territory_id IN (:...ids)', { ids: territoryIds })
          .select([
            'r.id AS id',
            'r.code AS code',
            'r.name AS name',
            'r.territory_id AS territory_id',
            'r.default_delivery_day AS default_delivery_day',
            'r.is_delivery_route AS is_delivery_route',
          ])
          .orderBy('r.name', 'ASC')
          .getRawMany();

        const routesByTerritory = new Map<string, any[]>();
        for (const rt of routes) {
          if (!routesByTerritory.has(rt.territory_id)) routesByTerritory.set(rt.territory_id, []);
          routesByTerritory.get(rt.territory_id)!.push(rt);
        }

        for (const node of byId.values()) {
          if (Number(node.level_no) === OrgLevel.TERRITORY) {
            node.routes = routesByTerritory.get(node.id) ?? [];
          }
        }
      }
    }

    return roots;
  }

  async getSubordinateRoutes(auth: any, nodeId: string) {
    const company_id = auth.company_id;

    const node = await this.repo.findOne({
      where: { id: nodeId, company_id, deleted_at: null } as any,
    });
    if (!node) throw new NotFoundException('Org node not found');

    const basePath = (node as any).path ?? `/${(node as any).id}/`;

    const territories = await this.repo
      .createQueryBuilder('n')
      .where('n.company_id = :company_id', { company_id })
      .andWhere('n.deleted_at IS NULL')
      .andWhere('n.level_no = :lvl', { lvl: OrgLevel.TERRITORY })
      .andWhere('n.path LIKE :p', { p: `${basePath}%` })
      .select(['n.id AS id', 'n.code AS code', 'n.name AS name'])
      .getRawMany();

    const territoryIds = territories.map((t: any) => t.id);
    if (!territoryIds.length) {
      return { success: true, message: 'OK', data: { territories: [], routes: [] } };
    }

    const routes = await this.routeRepo
      .createQueryBuilder('r')
      .where('r.company_id = :company_id', { company_id })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.territory_id IN (:...ids)', { ids: territoryIds })
      .select([
        'r.id AS id',
        'r.code AS code',
        'r.name AS name',
        'r.territory_id AS territory_id',
        'r.default_delivery_day AS default_delivery_day',
        'r.is_delivery_route AS is_delivery_route',
      ])
      .orderBy('r.name', 'ASC')
      .getRawMany();

    return { territories, routes };
  }

  // =========================================================
  // Path logic
  // =========================================================

  private async setPathAfterCreate(
    repo: Repository<OrgHierarchy>,
    company_id: string,
    nodeId: string,
  ) {
    const node = await repo.findOne({
      where: { id: nodeId, company_id, deleted_at: null } as any,
    });
    if (!node) return;

    let newPath = `/${(node as any).id}/`;
    if ((node as any).parent_id) {
      const parent = await repo.findOne({
        where: { id: (node as any).parent_id, company_id, deleted_at: null } as any,
      });
      const parentPath = (parent as any)?.path ?? `/${(node as any).parent_id}/`;
      newPath = `${parentPath}${(node as any).id}/`;
    }

    if ((node as any).path !== newPath) {
      (node as any).path = newPath;
      await repo.save(node);
    }
  }

  private async rebuildPathSubtree(
    company_id: string,
    nodeId: string,
    repoOverride?: Repository<OrgHierarchy>,
  ) {
    const repo = repoOverride ?? this.repo;

    const node = await repo.findOne({
      where: { id: nodeId, company_id, deleted_at: null } as any,
    });
    if (!node) return;

    const oldPath = (node as any).path ?? `/${(node as any).id}/`;

    let newPath = `/${(node as any).id}/`;
    if ((node as any).parent_id) {
      const parent = await repo.findOne({
        where: { id: (node as any).parent_id, company_id, deleted_at: null } as any,
      });
      const parentPath = (parent as any)?.path ?? `/${(node as any).parent_id}/`;
      newPath = `${parentPath}${(node as any).id}/`;
    }

    if (oldPath === newPath) return;

    (node as any).path = newPath;
    await repo.save(node);

    const oldRegex = this.escapeRegexForPostgres(oldPath);
    const safeNew = this.escapeSqlLiteral(newPath);

    await repo
      .createQueryBuilder()
      .update(OrgHierarchy)
      .set({
        path: () => `regexp_replace(path, '^${oldRegex}', '${safeNew}')`,
      } as any)
      .where('company_id = :company_id', { company_id })
      .andWhere('deleted_at IS NULL')
      .andWhere('path LIKE :like', { like: `${oldPath}%` })
      .execute();
  }

  private escapeRegexForPostgres(input: string) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private escapeSqlLiteral(input: string) {
    return input.replace(/'/g, "''");
  }
}
