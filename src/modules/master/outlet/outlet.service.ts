import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Brackets, Repository } from 'typeorm';

import * as XLSX from 'xlsx';

import { MdOutlet } from '../entities/md_outlet.entity';
import { MdOutletOrg } from '../entities/md_outlet_org.entity';
import { MdOutletDistributor } from '../entities/md_outlet_distributor.entity';
import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity'; // adjust path/name
import { MdDistributor } from '../../distributors/entities/distributor.entity';

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
  MapOutletOrgByCodeDto,
  MapOutletDistributorByCodeDto,
  BulkMapOutletOrgByCodeDto,
  BulkMapOutletDistributorByCodeDto,
} from './dto/outlet-mapping-by-code.dto';

import { UserScope } from '../../users/entities/user-scope.entity';
import { Route } from '../../org/entities/route.entity';
import { ScopeType, Status, UserType } from '../../../common/constants/enums';

type AuthUser = {
  company_id: string;
  user_id?: string;
  sub?: string;
  user_type?: number;
};
type OutletContext = {
  distributor_ids: string[];   // allowed distributor ids
  org_node_ids: string[];      // allowed territory ids (expanded)
  forceDistributor: boolean;   // distributor user lock
};
@Injectable()
export class OutletService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,

    @InjectRepository(MdOutlet) private readonly outletRepo: Repository<MdOutlet>,
    @InjectRepository(MdOutletOrg) private readonly outletOrgRepo: Repository<MdOutletOrg>,
    @InjectRepository(MdOutletDistributor) private readonly outletDistRepo: Repository<MdOutletDistributor>,

    @InjectRepository(UserScope) private readonly scopeRepo: Repository<UserScope>,
    @InjectRepository(Route) private readonly routeRepo: Repository<Route>,
    @InjectRepository(OrgHierarchy) private readonly orgRepo: Repository<OrgHierarchy>,
    @InjectRepository(MdDistributor) private readonly distRepo: Repository<MdDistributor>
  ) {}

  private actorId(auth: any) {
    return auth.user_id ?? auth.id ?? auth.sub ?? null;
  }

  private ymdToday() {
    const d = new Date();
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private prevDay(ymd: string) {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /** ---------------------------
   * Access control using md_user_scope
   * --------------------------- */
 private async resolveAccessScope(auth: AuthUser): Promise<{
  isAdmin: boolean;
  allowedOrgNodeIds: string[];
  allowedDistributorIds: string[];
}> {
  const userId = this.actorId(auth);
  if (!userId) return { isAdmin: false, allowedOrgNodeIds: [], allowedDistributorIds: [] };

  if (auth.user_type === UserType.EMPLOYEE /* or your ADMIN type */) {
    // only do this if EMPLOYEE means system admin in your project
    return { isAdmin: true, allowedOrgNodeIds: [], allowedDistributorIds: [] };
  }
  const scopes = await this.scopeRepo.find({
    where: { company_id: auth.company_id, user_id: userId } as any,
  });

  if (scopes.some((s) => s.scope_type === ScopeType.GLOBAL)) {
    return { isAdmin: true, allowedOrgNodeIds: [], allowedDistributorIds: [] };
  }

  const orgNodeIds = new Set<string>();
  const distributorIds = new Set<string>();
  const routeIds: string[] = [];

  for (const s of scopes) {
    if (s.scope_type === ScopeType.HIERARCHY && s.org_node_id) orgNodeIds.add(String(s.org_node_id));
    if (s.scope_type === ScopeType.DISTRIBUTOR && s.distributor_id) distributorIds.add(String(s.distributor_id));
    if (s.scope_type === ScopeType.ROUTE && s.route_id) routeIds.push(String(s.route_id));
  }

  // Expand ROUTE scopes => route.territory_id (org node)
  if (routeIds.length) {
    const rows = await this.routeRepo
      .createQueryBuilder('r')
      .select(['r.id AS id', 'r.territory_id AS territory_id'])
      .where('r.company_id = :cid', { cid: auth.company_id })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.id IN (:...ids)', { ids: routeIds })
      .getRawMany();

    for (const x of rows) {
      if (x.territory_id) orgNodeIds.add(String(x.territory_id));
    }
  }

  const expandedTerritoryIds =
  orgNodeIds.size ? await this.expandOrgScopeToTerritories(auth.company_id, [...orgNodeIds]) : [];

return {
  isAdmin: false,
  allowedOrgNodeIds: expandedTerritoryIds,
  allowedDistributorIds: [...distributorIds],
};

}

private applyAccessFilter(
  qb: any,
  scope: { isAdmin: boolean; allowedOrgNodeIds: string[]; allowedDistributorIds: string[] },
) {
  if (scope.isAdmin) return;

  // Distributor scope has priority (most restrictive)
  if (scope.allowedDistributorIds.length) {
    qb.andWhere('od.distributor_id IN (:...dids)', { dids: scope.allowedDistributorIds });
    return;
  }

  // Otherwise org scope
  if (scope.allowedOrgNodeIds.length) {
    qb.andWhere('oog.org_node_id IN (:...oids)', { oids: scope.allowedOrgNodeIds });
    return;
  }

  // No scope => no data
  qb.andWhere('1=0');
}


  /** ---------------------------
   * Outlet CRUD
   * --------------------------- */
  async create(auth: AuthUser, dto: CreateOutletDto) {
    const row = this.outletRepo.create({
      company_id: auth.company_id,
      code: dto.code.trim(),
      name: dto.name.trim(),
      outlet_type: dto.outlet_type,
      owner_name: dto.owner_name ?? null,
      mobile: dto.mobile ?? null,
      address: dto.address ?? null,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      effective_from: dto.effective_from ?? null,
      effective_to: dto.effective_to ?? null,
      status: Status.INACTIVE,
      created_by: this.actorId(auth),
    } as any);

    try {
      return await this.outletRepo.save(row);
    } catch (e: any) {
      if (e?.code === '23505') throw new ConflictException('Outlet code already exists');
      throw e;
    }
  }

  async bulkCreate(auth: AuthUser, dto: BulkCreateOutletDto) {
  if (!dto.rows?.length) throw new BadRequestException('rows is required');

  const cleaned = dto.rows
    .map((r, idx) => ({
      idx,
      code: String(r.code ?? '').trim(),
      name: String(r.name ?? '').trim(),
      outlet_type: Number(r.outlet_type ?? 0),
      owner_name: r.owner_name ?? null,
      mobile: r.mobile ?? null,
      address: r.address ?? null,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      effective_from: r.effective_from ?? null,
      effective_to: r.effective_to ?? null,
    }))
    .filter((r) => r.code || r.name);

  if (!cleaned.length) throw new BadRequestException('No valid rows found');

  for (const r of cleaned) {
    if (!r.code) throw new BadRequestException(`Row ${r.idx + 1}: code is required`);
    if (!r.name) throw new BadRequestException(`Row ${r.idx + 1}: name is required`);
    if (!r.outlet_type) throw new BadRequestException(`Row ${r.idx + 1}: outlet_type is required`);
  }

  const seen = new Set<string>();
  for (const r of cleaned) {
    const c = r.code.toUpperCase();
    if (seen.has(c)) throw new BadRequestException(`Duplicate code in payload: ${r.code}`);
    seen.add(c);
  }

  return this.dataSource.transaction(async (manager) => {
    const repo = manager.getRepository(MdOutlet);

    // DB duplicate check (exact match; if you want case-insensitive, normalize code on write)
    const codes = cleaned.map((r) => r.code);
    const existing = await repo
      .createQueryBuilder('o')
      .select(['o.code AS code'])
      .where('o.company_id=:cid', { cid: auth.company_id })
      .andWhere('o.deleted_at IS NULL')
      .andWhere('o.code IN (:...codes)', { codes })
      .getRawMany();

    if (existing.length) {
      throw new ConflictException(
        `Outlet code already exists: ${existing.map((x) => x.code).slice(0, 30).join(', ')}`,
      );
    }

    const actor = this.actorId(auth);

    const payload = cleaned.map((r) => ({
      company_id: auth.company_id,
      code: r.code, // or r.code.toUpperCase() if you want normalized storage
      name: r.name,
      outlet_type: r.outlet_type,
      owner_name: r.owner_name,
      mobile: r.mobile,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      effective_from: r.effective_from,
      effective_to: r.effective_to,
      status: Status.INACTIVE,
      created_by: actor,
    }));

    try {
      const inserted = await repo
        .createQueryBuilder()
        .insert()
        .into(MdOutlet)
        .values(payload)
        .returning(['id', 'code'])
        .execute();

      return {
          created: inserted.identifiers.length,
          ids: inserted.identifiers.map((x: any) => x.id),
          codes: inserted.raw?.map((x: any) => x.code) ?? [],
        };
    } catch (e: any) {
      // unique violation (if you have unique index)
      if (e?.code === '23505') throw new ConflictException('Outlet code already exists');
      throw e;
    }
  });
}

  async update(auth: AuthUser, id: string, dto: UpdateOutletDto) {
    const row = await this.outletRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Outlet not found');

    Object.assign(row, {
      name: dto.name?.trim() ?? row.name,
      outlet_type: dto.outlet_type ?? row.outlet_type,
      owner_name: dto.owner_name === undefined ? row.owner_name : dto.owner_name,
      mobile: dto.mobile === undefined ? row.mobile : dto.mobile,
      address: dto.address === undefined ? row.address : dto.address,
      lat: dto.lat === undefined ? row.lat : dto.lat,
      lng: dto.lng === undefined ? row.lng : dto.lng,
      effective_from: dto.effective_from === undefined ? row.effective_from : dto.effective_from,
      effective_to: dto.effective_to === undefined ? row.effective_to : dto.effective_to,
      status: dto.status ?? row.status,
      updated_by: this.actorId(auth),
    });

    return await this.outletRepo.save(row);
  }

  async remove(auth: AuthUser, id: string) {
    const row = await this.outletRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!row) throw new NotFoundException('Outlet not found');

    row.deleted_at = new Date();
    row.deleted_by = this.actorId(auth);
    return await this.outletRepo.save(row);
  }

async findOne(auth: AuthUser, id: string) {
  const scope = await this.resolveAccessScope(auth);
  const today = this.ymdToday();

  const qb = this.outletRepo
    .createQueryBuilder('o')
    .where('o.company_id = :cid', { cid: auth.company_id })
    .andWhere('o.id = :id', { id })
    .andWhere('o.deleted_at IS NULL')

    .leftJoin(
      MdOutletOrg,
      'oog',
      `oog.company_id=o.company_id AND oog.outlet_id=o.id
       AND oog.status = :active
       AND oog.effective_from <= :today
       AND (oog.effective_to IS NULL OR oog.effective_to >= :today)`,
      { today, active: Status.ACTIVE },
    )
    .leftJoin(
      MdOutletDistributor,
      'od',
      `od.company_id=o.company_id AND od.outlet_id=o.id
       AND od.status = :active
       AND od.effective_from <= :today
       AND (od.effective_to IS NULL OR od.effective_to >= :today)`,
      { today, active: Status.ACTIVE },
    )
    .leftJoin(
      MdDistributor,
      'd',
      `d.company_id = o.company_id
       AND d.id = od.distributor_id
       AND d.deleted_at IS NULL`,
    );

  this.applyAccessFilter(qb, scope);

  const raw = await qb
    .select([
      'o.id AS id',
      'o.code AS code',
      'o.name AS name',
      'o.outlet_type AS outlet_type',
      'o.owner_name AS owner_name',
      'o.mobile AS mobile',
      'o.address AS address',
      'o.lat AS lat',
      'o.lng AS lng',
      'o.status AS status',
      'o.effective_from AS effective_from',
      'o.effective_to AS effective_to',

      'oog.org_node_id AS org_node_id',
      'od.distributor_id AS distributor_id',

      'd.code AS distributor_code',
      'd.name AS distributor_name',
    ])
    .getRawOne();

  if (!raw) throw new NotFoundException('Outlet not found (or not permitted)');
  return raw;
}


async list(auth: AuthUser, dto: ListOutletDto) {
  const scope = await this.resolveAccessScope(auth);
  const page = Math.max(1, dto.page ?? 1);
  const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
  const skip = (page - 1) * limit;

  const today = this.ymdToday();

const qb = this.outletRepo
  .createQueryBuilder('o')
  .where('o.company_id=:cid', { cid: auth.company_id })
  .andWhere('o.deleted_at IS NULL')
  .leftJoin(
    MdOutletOrg,
    'oog',
    `oog.company_id=o.company_id AND oog.outlet_id=o.id
     AND oog.status = :active
     AND oog.effective_from <= :today
     AND (oog.effective_to IS NULL OR oog.effective_to >= :today)`,
    { today, active: Status.ACTIVE },
  )
  .leftJoin(
    MdOutletDistributor,
    'od',
    `od.company_id=o.company_id AND od.outlet_id=o.id
     AND od.status = :active
     AND od.effective_from <= :today
     AND (od.effective_to IS NULL OR od.effective_to >= :today)`,
    { today, active: Status.ACTIVE },
  )
  .leftJoin(
    MdDistributor,
    'd',
    `d.company_id = o.company_id
     AND d.id = od.distributor_id
     AND d.deleted_at IS NULL`,
  );

  if (dto.status !== undefined) qb.andWhere('o.status = :st', { st: dto.status });
  if (dto.outlet_type !== undefined) qb.andWhere('o.outlet_type = :ot', { ot: dto.outlet_type });

  if (dto.q?.trim()) {
    const q = `%${dto.q.trim()}%`;
    qb.andWhere(
      new Brackets((b) => {
        b.where('o.code ILIKE :q', { q }).orWhere('o.name ILIKE :q', { q });
      }),
    );
  }

  if (dto.org_node_id) qb.andWhere('oog.org_node_id = :on', { on: dto.org_node_id });
  if (dto.distributor_id) qb.andWhere('od.distributor_id = :did', { did: dto.distributor_id });
  this.applyAccessFilter(qb, scope);

  const rows = await qb
  .clone()
  .orderBy('o.id', 'DESC')
  .skip(skip)
  .take(limit)
  .select([
    'o.id AS id',
    'o.code AS code',
    'o.name AS name',
    'o.address AS address',
    'o.outlet_type AS outlet_type',
    'o.mobile AS mobile',
    'o.status AS status',
    'oog.org_node_id AS org_node_id',
    'od.distributor_id AS distributor_id',
    'd.code AS distributor_code',
    'd.name AS distributor_name',
  ])
  .getRawMany();


  const total = await qb.clone().getCount();

  return { page, limit, total, rows };
}

  /** ---------------------------
   * Mapping helper: close overlap and insert new
   * overlap rule: any row that covers effective_from date
   * --------------------------- */
  private async closeOverlapAndInsertOrg(manager: any, auth: AuthUser, dto: MapOutletOrgDto) {
    const repo = manager.getRepository(MdOutletOrg);

    const overlap = await repo
      .createQueryBuilder('m')
      .where('m.company_id=:cid', { cid: auth.company_id })
      .andWhere('m.outlet_id=:oid', { oid: dto.outlet_id })
      .andWhere('m.deleted_at IS NULL')
      .andWhere('m.effective_from <= :from', { from: dto.effective_from })
      .andWhere('(m.effective_to IS NULL OR m.effective_to >= :from)', { from: dto.effective_from })
      .getOne();

    if (overlap) {
      overlap.effective_to = this.prevDay(dto.effective_from);
      overlap.status = Status.INACTIVE;
      overlap.updated_by = this.actorId(auth);
      await repo.save(overlap);
    }

    const row = repo.create({
      company_id: auth.company_id,
      outlet_id: dto.outlet_id,
      org_node_id: dto.org_node_id,
      effective_from: dto.effective_from,
      effective_to: dto.effective_to ?? null,
      status: Status.ACTIVE,
      created_by: this.actorId(auth),
    } as any);

    return repo.save(row);
  }

  private async closeOverlapAndInsertDistributor(manager: any, auth: AuthUser, dto: MapOutletDistributorDto) {
    const repo = manager.getRepository(MdOutletDistributor);

    const overlap = await repo
      .createQueryBuilder('m')
      .where('m.company_id=:cid', { cid: auth.company_id })
      .andWhere('m.outlet_id=:oid', { oid: dto.outlet_id })
      .andWhere('m.deleted_at IS NULL')
      .andWhere('m.effective_from <= :from', { from: dto.effective_from })
      .andWhere('(m.effective_to IS NULL OR m.effective_to >= :from)', { from: dto.effective_from })
      .getOne();

    if (overlap) {
      overlap.effective_to = this.prevDay(dto.effective_from);
      overlap.status = Status.INACTIVE;
      overlap.updated_by = this.actorId(auth);
      await repo.save(overlap);
    }

    const row = repo.create({
      company_id: auth.company_id,
      outlet_id: dto.outlet_id,
      distributor_id: dto.distributor_id,
      effective_from: dto.effective_from,
      effective_to: dto.effective_to ?? null,
      status: Status.ACTIVE,
      created_by: this.actorId(auth),
    } as any);

    return repo.save(row);
  }

  /** ---------------------------
   * Excel helpers (xlsx)
   * --------------------------- */
  private parseExcel(buffer: Buffer): any[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true }); // ✅
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new BadRequestException('Excel has no sheets');

  const ws = wb.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(ws, {
    defval: '',
    raw: true,     // keep raw values (numbers, dates)
  }) as any[];

  const cleaned = rows.filter((r) =>
    Object.values(r ?? {}).some((v) => String(v ?? '').trim() !== ''),
  );

  if (!cleaned.length) throw new BadRequestException('Excel has no data rows');
  return cleaned;
}

  async bulkCreateFromExcel(auth: AuthUser, file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('file is required');
    const rows = this.parseExcel(file.buffer);

    // expected columns: code, name, outlet_type, owner_name, mobile, address, lat, lng, effective_from, effective_to
    const dto: BulkCreateOutletDto = {
      rows: rows.map((r) => ({
        code: String(r.code ?? '').trim(),
        name: String(r.name ?? '').trim(),
        outlet_type: Number(r.outlet_type ?? 0),
        owner_name: r.owner_name ? String(r.owner_name) : null,
        mobile: r.mobile ? String(r.mobile) : null,
        address: r.address ? String(r.address) : null,
        lat: r.lat ? String(r.lat) : null,
        lng: r.lng ? String(r.lng) : null,
        effective_from: r.effective_from ? String(r.effective_from) : null,
        effective_to: r.effective_to ? String(r.effective_to) : null,
      })),
    };

    // basic validation
    for (const x of dto.rows) {
      if (!x.code) throw new BadRequestException('Excel missing code');
      if (!x.name) throw new BadRequestException(`Excel missing name for code ${x.code}`);
      if (!x.outlet_type) throw new BadRequestException(`Excel missing outlet_type for code ${x.code}`);
    }

    return this.bulkCreate(auth, dto);
  }
  private normalizeCode(x: any) {
  return String(x ?? '').trim();
    }

private normalizeCodeKey(x: any) {
  return this.normalizeCode(x).toUpperCase();
}

private async resolveOutletIdsByCodes(
  manager: any,
  auth: AuthUser,
  outletCodes: string[],
): Promise<Map<string, string>> {
  const repo = manager.getRepository(MdOutlet);

  const codes = [...new Set(outletCodes.map((c) => this.normalizeCode(c)).filter(Boolean))];
  if (!codes.length) return new Map();

  const rows = await repo
    .createQueryBuilder('o')
    .select(['o.id AS id', 'o.code AS code'])
    .where('o.company_id = :cid', { cid: auth.company_id })
    .andWhere('o.deleted_at IS NULL')
    .andWhere('o.code IN (:...codes)', { codes })
    .getRawMany();

  const map = new Map<string, string>();
  for (const r of rows) map.set(this.normalizeCodeKey(r.code), String(r.id));
  return map;
}

private async resolveOrgNodeIdsByCodes(
  manager: any,
  auth: AuthUser,
  orgCodes: string[],
): Promise<Map<string, string>> {
  const repo = manager.getRepository(OrgHierarchy);

  const codes = [...new Set(orgCodes.map((c) => this.normalizeCode(c)).filter(Boolean))];
  if (!codes.length) return new Map();

  const rows = await repo
    .createQueryBuilder('n')
    .select(['n.id AS id', 'n.code AS code'])
    .where('n.company_id = :cid', { cid: auth.company_id })
    .andWhere('n.deleted_at IS NULL')
    .andWhere('n.code IN (:...codes)', { codes })
    .getRawMany();

  const map = new Map<string, string>();
  for (const r of rows) map.set(this.normalizeCodeKey(r.code), String(r.id));
  return map;
}

private async resolveDistributorIdsByCodes(
  manager: any,
  auth: AuthUser,
  distCodes: string[],
): Promise<Map<string, string>> {
  const repo = manager.getRepository(MdDistributor);

  const codes = [...new Set(distCodes.map((c) => this.normalizeCode(c)).filter(Boolean))];
  if (!codes.length) return new Map();

  const rows = await repo
    .createQueryBuilder('d')
    .select(['d.id AS id', 'd.code AS code'])
    .where('d.company_id = :cid', { cid: auth.company_id })
    .andWhere('d.deleted_at IS NULL')
    .andWhere('d.code IN (:...codes)', { codes })
    .getRawMany();

  const map = new Map<string, string>();
  for (const r of rows) map.set(this.normalizeCodeKey(r.code), String(r.id));
  return map;
}
async mapOutletOrgByCode(auth: AuthUser, dto: MapOutletOrgByCodeDto) {
  return this.dataSource.transaction(async (manager) => {
    const outletMap = await this.resolveOutletIdsByCodes(manager, auth, [dto.outlet_code]);
    const orgMap = await this.resolveOrgNodeIdsByCodes(manager, auth, [dto.org_node_code]);

    const outlet_id = outletMap.get(this.normalizeCodeKey(dto.outlet_code));
    if (!outlet_id) throw new BadRequestException(`Invalid outlet_code: ${dto.outlet_code}`);

    const org_node_id = orgMap.get(this.normalizeCodeKey(dto.org_node_code));
    if (!org_node_id) throw new BadRequestException(`Invalid org_node_code: ${dto.org_node_code}`);

    const saved = await this.closeOverlapAndInsertOrg(manager, auth, {
      outlet_id,
      org_node_id,
      effective_from: dto.effective_from,
      effective_to: dto.effective_to ?? null,
    });

    return { success: true, message: 'OK', data: { id: saved.id } };
  });
}

async mapOutletDistributorByCode(auth: AuthUser, dto: MapOutletDistributorByCodeDto) {
  return this.dataSource.transaction(async (manager) => {
    const outletMap = await this.resolveOutletIdsByCodes(manager, auth, [dto.outlet_code]);
    const distMap = await this.resolveDistributorIdsByCodes(manager, auth, [dto.distributor_code]);

    const outlet_id = outletMap.get(this.normalizeCodeKey(dto.outlet_code));
    if (!outlet_id) throw new BadRequestException(`Invalid outlet_code: ${dto.outlet_code}`);

    const distributor_id = distMap.get(this.normalizeCodeKey(dto.distributor_code));
    if (!distributor_id) throw new BadRequestException(`Invalid distributor_code: ${dto.distributor_code}`);

    const saved = await this.closeOverlapAndInsertDistributor(manager, auth, {
      outlet_id,
      distributor_id,
      effective_from: dto.effective_from,
      effective_to: dto.effective_to ?? null,
    });

    return { success: true, message: 'OK', data: { id: saved.id } };
  });
}
async bulkMapOutletOrgByCode(auth: AuthUser, dto: BulkMapOutletOrgByCodeDto) {
  if (!dto.rows?.length) throw new BadRequestException('rows is required');

  // payload dup check
  const seen = new Set<string>();
  for (const r of dto.rows) {
    const key = `${this.normalizeCodeKey(r.outlet_code)}__${r.effective_from}`;
    if (seen.has(key)) throw new BadRequestException(`Duplicate in payload: ${key}`);
    seen.add(key);
  }

  return this.dataSource.transaction(async (manager) => {
    const outletCodes = dto.rows.map((r) => r.outlet_code);
    const orgCodes = dto.rows.map((r) => r.org_node_code);

    const outletMap = await this.resolveOutletIdsByCodes(manager, auth, outletCodes);
    const orgMap = await this.resolveOrgNodeIdsByCodes(manager, auth, orgCodes);

    // validate missing (show up to 30)
    const missingOutlet = [...new Set(dto.rows.map((r) => this.normalizeCodeKey(r.outlet_code)))]
      .filter((c) => !outletMap.has(c));
    if (missingOutlet.length) {
      throw new BadRequestException(`Invalid outlet_code(s): ${missingOutlet.slice(0, 30).join(', ')}`);
    }

    const missingOrg = [...new Set(dto.rows.map((r) => this.normalizeCodeKey(r.org_node_code)))]
      .filter((c) => !orgMap.has(c));
    if (missingOrg.length) {
      throw new BadRequestException(`Invalid org_node_code(s): ${missingOrg.slice(0, 30).join(', ')}`);
    }

    const results: any[] = [];
    for (const r of dto.rows) {
      try {
        const saved = await this.closeOverlapAndInsertOrg(manager, auth, {
          outlet_id: outletMap.get(this.normalizeCodeKey(r.outlet_code))!,
          org_node_id: orgMap.get(this.normalizeCodeKey(r.org_node_code))!,
          effective_from: r.effective_from,
          effective_to: r.effective_to ?? null,
        });
        results.push({ outlet_code: r.outlet_code, id: saved.id, status: 'OK' });
      } catch (e: any) {
        if (e?.code === '23505') {
          results.push({ outlet_code: r.outlet_code, status: 'DUPLICATE_EFFECTIVE_FROM' });
          continue;
        }
        throw e;
      }
    }
    return results;
  });
}

async bulkMapOutletDistributorByCode(auth: AuthUser, dto: BulkMapOutletDistributorByCodeDto) {
  if (!dto.rows?.length) throw new BadRequestException('rows is required');

  const seen = new Set<string>();
  for (const r of dto.rows) {
    const key = `${this.normalizeCodeKey(r.outlet_code)}__${r.effective_from}`;
    if (seen.has(key)) throw new BadRequestException(`Duplicate in payload: ${key}`);
    seen.add(key);
  }

  return this.dataSource.transaction(async (manager) => {
    const outletCodes = dto.rows.map((r) => r.outlet_code);
    const distCodes = dto.rows.map((r) => r.distributor_code);

    const outletMap = await this.resolveOutletIdsByCodes(manager, auth, outletCodes);
    const distMap = await this.resolveDistributorIdsByCodes(manager, auth, distCodes);

    const missingOutlet = [...new Set(dto.rows.map((r) => this.normalizeCodeKey(r.outlet_code)))]
      .filter((c) => !outletMap.has(c));
    if (missingOutlet.length) {
      throw new BadRequestException(`Invalid outlet_code(s): ${missingOutlet.slice(0, 30).join(', ')}`);
    }

    const missingDist = [...new Set(dto.rows.map((r) => this.normalizeCodeKey(r.distributor_code)))]
      .filter((c) => !distMap.has(c));
    if (missingDist.length) {
      throw new BadRequestException(`Invalid distributor_code(s): ${missingDist.slice(0, 30).join(', ')}`);
    }

    const results: any[] = [];
    for (const r of dto.rows) {
      try {
        const saved = await this.closeOverlapAndInsertDistributor(manager, auth, {
          outlet_id: outletMap.get(this.normalizeCodeKey(r.outlet_code))!,
          distributor_id: distMap.get(this.normalizeCodeKey(r.distributor_code))!,
          effective_from: r.effective_from,
          effective_to: r.effective_to ?? null,
        });
        results.push({ outlet_code: r.outlet_code, id: saved.id, status: 'OK' });
      } catch (e: any) {
        if (e?.code === '23505') {
          results.push({ outlet_code: r.outlet_code, status: 'DUPLICATE_EFFECTIVE_FROM' });
          continue;
        }
        throw e;
      }
    }
    return results;
  });
}
async bulkMapOrgByCodeFromExcel(auth: AuthUser, file: Express.Multer.File) {
  if (!file?.buffer) throw new BadRequestException('file is required');
  const rows = this.parseExcel(file.buffer);

  const dto: BulkMapOutletOrgByCodeDto = {
    rows: rows.map((r) => ({
      outlet_code: String(r.outlet_code ?? '').trim(),
      org_node_code: String(r.org_node_code ?? '').trim(),
      effective_from: this.excelDateToYmd(r.effective_from) ?? '',
      effective_to: this.excelDateToYmd(r.effective_to),
    })),
  };

  for (const x of dto.rows) {
    if (!x.outlet_code || !x.org_node_code || !x.effective_from) {
      throw new BadRequestException('Excel requires outlet_code, org_node_code, effective_from');
    }
  }

  return this.bulkMapOutletOrgByCode(auth, dto);
}

async bulkMapDistributorByCodeFromExcel(auth: AuthUser, file: Express.Multer.File) {
  if (!file?.buffer) throw new BadRequestException('file is required');
  const rows = this.parseExcel(file.buffer);

  const dto: BulkMapOutletDistributorByCodeDto = {
    rows: rows.map((r) => ({
      outlet_code: String(r.outlet_code ?? '').trim(),
      distributor_code: String(r.distributor_code ?? '').trim(),
      effective_from: this.excelDateToYmd(r.effective_from) ?? '',
      effective_to: this.excelDateToYmd(r.effective_to),
    })),
  };

  for (const x of dto.rows) {
    if (!x.outlet_code || !x.distributor_code || !x.effective_from) {
      throw new BadRequestException('Excel requires outlet_code, distributor_code, effective_from');
    }
  }

  return this.bulkMapOutletDistributorByCode(auth, dto);
}
private excelDateToYmd(v: any): string | null {
  if (v === null || v === undefined || v === '') return null;

  // already a Date
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }

  // excel serial number (e.g., 46388)
  if (typeof v === 'number' && isFinite(v)) {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const yyyy = String(d.y).padStart(4, '0');
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // string: accept "YYYY-MM-DD" or "DD/MM/YYYY" etc
  const s = String(v).trim();
  if (!s) return null;

  // if user typed 2026-01-01
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // try Date parse fallback
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);

  return null;
}
private async expandOrgScopeToTerritories(
  companyId: string,
  orgNodeIds: string[],
): Promise<string[]> {
  if (!orgNodeIds?.length) return [];

  // Recursive CTE: from given nodes → all descendants → pick only level_no=5
  const rows = await this.orgRepo.query(
    `
    WITH RECURSIVE tree AS (
      SELECT id, level_no
      FROM md_org_hierarchy
      WHERE company_id = $1
        AND deleted_at IS NULL
        AND id = ANY($2::bigint[])
      UNION ALL
      SELECT c.id, c.level_no
      FROM md_org_hierarchy c
      JOIN tree p ON p.id = c.parent_id
      WHERE c.company_id = $1
        AND c.deleted_at IS NULL
    )
    SELECT DISTINCT id
    FROM tree
    WHERE level_no = 5
    `,
    [companyId, orgNodeIds.map((x) => Number(x))],
  );

  return rows.map((r: any) => String(r.id));
}
async listMappedOrg(auth: AuthUser, dto: ListOutletDto) {
  const ctx = await this.resolveOutletContext(auth, dto);

  const page = Math.max(1, dto.page ?? 1);
  const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
  const skip = (page - 1) * limit;
  const today = this.ymdToday();

  const qb = this.outletRepo
    .createQueryBuilder('o')
    .where('o.company_id=:cid', { cid: auth.company_id })
    .andWhere('o.deleted_at IS NULL')

    // must have org mapping
    .innerJoin(
      MdOutletOrg,
      'oog',
      `oog.company_id=o.company_id AND oog.outlet_id=o.id
       AND oog.status = :active
       AND oog.effective_from <= :today
       AND (oog.effective_to IS NULL OR oog.effective_to >= :today)`,
      { today, active: Status.ACTIVE },
    )

    // must have distributor mapping
    .innerJoin(
      MdOutletDistributor,
      'od',
      `od.company_id=o.company_id AND od.outlet_id=o.id
       AND od.status = :active
       AND od.effective_from <= :today
       AND (od.effective_to IS NULL OR od.effective_to >= :today)`,
      { today, active: Status.ACTIVE },
    )

    .innerJoin(
      MdDistributor,
      'd',
      `d.company_id=o.company_id AND d.id=od.distributor_id AND d.deleted_at IS NULL`,
    );

  // search by code/name
  if (dto.q?.trim()) {
    const q = `%${dto.q.trim()}%`;
    qb.andWhere(
      new Brackets((b) => {
        b.where('o.code ILIKE :q', { q }).orWhere('o.name ILIKE :q', { q });
      }),
    );
  }

  // ---- Scope enforcement (important) ----
  // distributor user: lock to their distributor scope(s)
  if (ctx.forceDistributor) {
    if (!ctx.distributor_ids.length) qb.andWhere('1=0');
    else qb.andWhere('od.distributor_id IN (:...dids)', { dids: ctx.distributor_ids });
  } else {
    // employee/org user: apply distributor scope if present, else org scope
    if (ctx.distributor_ids.length) {
      qb.andWhere('od.distributor_id IN (:...dids)', { dids: ctx.distributor_ids });
    } else if (ctx.org_node_ids.length) {
      qb.andWhere('oog.org_node_id IN (:...oids)', { oids: ctx.org_node_ids });
    } else {
      qb.andWhere('1=0');
    }

    // allow optional filter inside allowed scope
    if (dto.distributor_id) qb.andWhere('od.distributor_id = :did', { did: dto.distributor_id });
    if (dto.org_node_id) qb.andWhere('oog.org_node_id = :oid', { oid: dto.org_node_id });
  }

  // optional common filters
  if (dto.status !== undefined) qb.andWhere('o.status = :st', { st: dto.status });
  if (dto.outlet_type !== undefined) qb.andWhere('o.outlet_type = :ot', { ot: dto.outlet_type });

  const rows = await qb
    .clone()
    .orderBy('o.id', 'DESC')
    .skip(skip)
    .take(limit)
    .select([
      'o.id AS id',
      'o.code AS code',
      'o.name AS name',
      'o.address AS address',
      'o.outlet_type AS outlet_type',
      'o.mobile AS mobile',
      'o.status AS status',
      'oog.org_node_id AS org_node_id',
      'od.distributor_id AS distributor_id',
      'd.code AS distributor_code',
      'd.name AS distributor_name',
    ])
    .getRawMany();

  const total = await qb.clone().getCount();
  return { page, limit, total, rows };
}


async listMyNewCustomers(auth: AuthUser, dto: ListOutletDto) {
  const userId = this.actorId(auth);
  if (!userId) throw new BadRequestException('Invalid user');

  const scope = await this.resolveAccessScope(auth);

  const page = Math.max(1, dto.page ?? 1);
  const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
  const skip = (page - 1) * limit;

  const qb = this.outletRepo
    .createQueryBuilder('o')
    .where('o.company_id=:cid', { cid: auth.company_id })
    .andWhere('o.deleted_at IS NULL')
    .andWhere('o.status = :st', { st: Status.INACTIVE }) // ✅ new/pending (0)

    // ✅ only my created outlets
    .andWhere('o.created_by = :me', { me: userId });

  // optional filters (same as your list)
  if (dto.outlet_type !== undefined) qb.andWhere('o.outlet_type = :ot', { ot: dto.outlet_type });

  if (dto.q?.trim()) {
    const q = `%${dto.q.trim()}%`;
    qb.andWhere(
      new Brackets((b) => {
        b.where('o.code ILIKE :q', { q }).orWhere('o.name ILIKE :q', { q });
      }),
    );
  }

  // NOTE:
  // For "my new customers" you typically should NOT apply distributor/org access filter,
  // because they might be unmapped yet. But if you still want, you can apply it only
  // if mappings exist. Best is: do NOT applyAccessFilter here.

  const rows = await qb
    .clone()
    .orderBy('o.id', 'DESC')
    .skip(skip)
    .take(limit)
    .select([
      'o.id AS id',
      'o.code AS code',
      'o.name AS name',
      'o.address AS address',
      'o.outlet_type AS outlet_type',
      'o.mobile AS mobile',
      'o.status AS status',
      'o.created_at AS created_at',
    ])
    .getRawMany();

  const total = await qb.clone().getCount();

  return { page, limit, total, rows };
}

private async resolveOutletContext(auth: AuthUser, dto: any): Promise<OutletContext> {
  const uid = this.actorId(auth);
  if (!uid) return { distributor_ids: [], org_node_ids: [], forceDistributor: false };

  const scopes = await this.scopeRepo.find({
    where: { company_id: auth.company_id as any, user_id: uid as any } as any,
    order: { id: 'DESC' as any },
    take: 200,
  });

  // ✅ Admin only if GLOBAL scope exists
  if (scopes.some((s) => Number(s.scope_type) === ScopeType.GLOBAL)) {
    return { distributor_ids: [], org_node_ids: [], forceDistributor: false };
  }

  const distributorIds = new Set<string>();
  const orgNodeIds = new Set<string>();
  const routeIds: string[] = [];

  for (const s of scopes) {
    if (Number(s.scope_type) === ScopeType.DISTRIBUTOR && s.distributor_id)
      distributorIds.add(String(s.distributor_id));

    if (Number(s.scope_type) === ScopeType.HIERARCHY && s.org_node_id)
      orgNodeIds.add(String(s.org_node_id));

    if (Number(s.scope_type) === ScopeType.ROUTE && s.route_id)
      routeIds.push(String(s.route_id));
  }

  // ROUTE -> territory_id
  if (routeIds.length) {
    const rows = await this.routeRepo
      .createQueryBuilder('r')
      .select(['r.id AS id', 'r.territory_id AS territory_id'])
      .where('r.company_id = :cid', { cid: auth.company_id })
      .andWhere('r.deleted_at IS NULL')
      .andWhere('r.id IN (:...ids)', { ids: routeIds })
      .getRawMany();

    for (const x of rows) if (x.territory_id) orgNodeIds.add(String(x.territory_id));
  }

  const expandedTerritoryIds =
    orgNodeIds.size ? await this.expandOrgScopeToTerritories(auth.company_id, [...orgNodeIds]) : [];

  const isDistUser =
    Number(auth.user_type) === UserType.DISTRIBUTOR_USER ||
    Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER;

  return {
    distributor_ids: [...distributorIds],
    org_node_ids: expandedTerritoryIds,
    forceDistributor: isDistUser,
  };
}

}
