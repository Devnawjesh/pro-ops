// src/modules/pricing/pricing.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, DeepPartial, Repository } from 'typeorm';

import { PriceList } from './entities/price-list.entity';
import { PriceListItem } from './entities/price-list-item.entity';
import { PriceListScope } from './entities/price-list-scope.entity';
import { Scheme } from './entities/scheme.entity';
import { SchemeRule } from './entities/scheme-rule.entity';

import { MdSku } from '../master/entities/md_sku.entity';
import { MdDistributor } from '../distributors/entities/distributor.entity';

import { UserScope } from '../users/entities/user-scope.entity';

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

import { UserType, ScopeType, Status } from '../../common/constants/enums';
import {
  cellDateISO,
  cellNum,
  cellStr,
  loadWorkbookFromBase64,
  sheetToObjects,
} from './utils/excel.util';
import {
  ensureDateOrder,
  normalizeCode,
  normalizeName,
  rangesOverlap,
} from './utils/pricing-rules.util';

import { UpdateSchemeRuleDto } from './dto/schema/update-scheme-rule.dto';
import { CreateSchemeRuleDto } from './dto/schema/create-scheme-rule.dto';

type AuthUser = {
  company_id: string;
  user_id?: string;
  id?: string;
  sub?: string;
  user_type?: number;
};

type ResolvedContext = {
  date: string;
  distributor_id: string | null;
  org_node_id: string | null;
  outlet_type: number | null;
};

@Injectable()
export class PricingService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,

    @InjectRepository(PriceList)
    private readonly priceListRepo: Repository<PriceList>,
    @InjectRepository(PriceListItem)
    private readonly itemRepo: Repository<PriceListItem>,
    @InjectRepository(PriceListScope)
    private readonly scopeRepo: Repository<PriceListScope>,

    @InjectRepository(Scheme)
    private readonly schemeRepo: Repository<Scheme>,
    @InjectRepository(SchemeRule)
    private readonly ruleRepo: Repository<SchemeRule>,

    @InjectRepository(MdSku)
    private readonly skuRepo: Repository<MdSku>,
    @InjectRepository(MdDistributor)
    private readonly distRepo: Repository<MdDistributor>,

    // ✅ add this
    @InjectRepository(UserScope)
    private readonly userScopeRepo: Repository<UserScope>,
  ) {}

  // ---------------- helpers ----------------

  private actorId(auth: any) {
    return auth.user_id ?? auth.id ?? auth.sub ?? null;
  }

  private assertISODate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
  }

  private ymdToday() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private dateInRange(date: string, from?: string | null, to?: string | null) {
    const a = from ?? '0000-01-01';
    const b = to ?? '9999-12-31';
    return a <= date && date <= b;
  }

  private scoreScope(params: {
    distributor_id?: string | null;
    outlet_type?: number | null;
    org_node_id?: string | null;
    scope_distributor_id?: string | null;
    scope_outlet_type?: number | null;
    scope_org_node_id?: string | null;
  }) {
    let score = 0;
    if (
      params.scope_distributor_id &&
      params.distributor_id &&
      params.scope_distributor_id === params.distributor_id
    )
      score += 100;

    if (
      params.scope_org_node_id &&
      params.org_node_id &&
      params.scope_org_node_id === params.org_node_id
    )
      score += 50;

    if (
      params.scope_outlet_type !== null &&
      params.scope_outlet_type !== undefined &&
      params.outlet_type !== null &&
      params.outlet_type !== undefined &&
      params.scope_outlet_type === params.outlet_type
    )
      score += 10;

    return score;
  }

private resolveContextFromQuery(dto: any): ResolvedContext {
  const date = dto?.date ? String(dto.date) : this.ymdToday();
  this.assertISODate(date);

  const distributor_id = dto?.distributor_id ? String(dto.distributor_id) : null;
  const org_node_id = dto?.org_node_id ? String(dto.org_node_id) : null;

  const outlet_type =
    dto?.outlet_type === 0 || dto?.outlet_type
      ? Number(dto.outlet_type)
      : null;

  return { date, distributor_id, org_node_id, outlet_type };
}
  // ---------------- PriceList CRUD ----------------

  async createPriceList(auth: AuthUser, dto: CreatePriceListDto) {
  const row = this.priceListRepo.create({
    company_id: auth.company_id,
    code: dto.code.trim(),
    name: dto.name.trim(),
    price_list_type: dto.price_list_type,
    remarks: dto.remarks ?? null,
    created_by: this.actorId(auth),
  } as any);

  try {
    const saved = await this.priceListRepo.save(row);
    return saved;
  } catch (e: any) {
    if (e?.code === '23505') {
      throw new ConflictException('Price list code already exists');
    }
    throw e;
  }
}

  async listPriceLists(auth: AuthUser, dto: ListPriceListDto) {
    const qb = this.priceListRepo
      .createQueryBuilder('pl')
      .where('pl.company_id=:cid', { cid: auth.company_id })
      .andWhere('pl.deleted_at IS NULL');

    if (dto.price_list_type)
      qb.andWhere('pl.price_list_type=:t', { t: dto.price_list_type });

    if (dto.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('pl.code ILIKE :q', { q: `%${dto.q}%` }).orWhere(
            'pl.name ILIKE :q',
            { q: `%${dto.q}%` },
          );
        }),
      );
    }

    qb.orderBy('pl.id', 'DESC')
      .skip((dto.page - 1) * dto.limit)
      .take(dto.limit);

    const [rows, total] = await qb.getManyAndCount();

    return { page: dto.page, limit: dto.limit, total, rows };
  }

  async getPriceList(auth: AuthUser, id: string) {
    const pl = await this.priceListRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!pl) throw new NotFoundException('Price list not found');

    const items = await this.itemRepo
      .createQueryBuilder('i')
      .select([
        'i.id AS id',
        'i.price_list_id AS price_list_id',
        'i.sku_id AS sku_id',
        'sku.code AS sku_code',
        'sku.name AS sku_name',
        'i.mrp AS mrp',
        'i.tp AS tp',
        'i.dp AS dp',
        'i.vat_rate AS vat_rate',
        'i.effective_from AS effective_from',
        'i.effective_to AS effective_to',
        'i.status AS status',
      ])
      .leftJoin('i.sku', 'sku')
      .where('i.company_id=:cid', { cid: auth.company_id })
      .andWhere('i.price_list_id=:plid', { plid: id })
      .andWhere('i.deleted_at IS NULL')
      .orderBy('i.id', 'ASC')
      .getRawMany();

    const scopes = await this.scopeRepo
      .createQueryBuilder('s')
      .select([
        's.id AS id',
        's.price_list_id AS price_list_id',
        's.distributor_id AS distributor_id',
        'd.code AS distributor_code',
        'd.name AS distributor_name',
        's.outlet_type AS outlet_type',
        's.org_node_id AS org_node_id',
        's.effective_from AS effective_from',
        's.effective_to AS effective_to',
        's.status AS status',
      ])
      .leftJoin('s.distributor', 'd')
      .where('s.company_id=:cid', { cid: auth.company_id })
      .andWhere('s.price_list_id=:plid', { plid: id })
      .andWhere('s.deleted_at IS NULL')
      .orderBy('s.id', 'ASC')
      .getRawMany();

    return { ...pl, items, scopes };
  }

  async updatePriceList(auth: AuthUser, id: string, dto: UpdatePriceListDto) {
    const pl = await this.priceListRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!pl) throw new NotFoundException('Price list not found');

    if (dto.name !== undefined) pl.name = normalizeName(dto.name);
    if (dto.price_list_type !== undefined)
      pl.price_list_type = dto.price_list_type as any;
    if (dto.remarks !== undefined) pl.remarks = dto.remarks ?? null;
    if (dto.status !== undefined) pl.status = dto.status as any;

    pl.updated_by = this.actorId(auth);
    return await this.priceListRepo.save(pl);
  }

  async softDeletePriceList(auth: AuthUser, id: string) {
    const pl = await this.priceListRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!pl) throw new NotFoundException('Price list not found');

    pl.deleted_at = new Date();
    pl.deleted_by = this.actorId(auth);
    return await this.priceListRepo.save(pl);
  }

  // ---------------- Scheme CRUD ----------------

  async createScheme(auth: AuthUser, dto: CreateSchemeDto) {
    ensureDateOrder(dto.effective_from ?? null, dto.effective_to ?? null);

    if (dto.distributor_id) {
      const d = await this.distRepo.findOne({
        where: {
          id: dto.distributor_id,
          company_id: auth.company_id,
          deleted_at: null,
        } as any,
      });
      if (!d) throw new BadRequestException('Invalid distributor_id');
    }

    const row = this.schemeRepo.create({
      company_id: auth.company_id,
      code: normalizeCode(dto.code),
      name: normalizeName(dto.name),
      scheme_type: dto.scheme_type ?? 0,
      priority: dto.priority ?? 0,
      can_stack: dto.can_stack ?? false,
      distributor_id: dto.distributor_id ?? null,
      outlet_type: (dto.outlet_type ?? null) as any,
      org_node_id: dto.org_node_id ?? null,
      status: (dto.status ?? Status.ACTIVE) as any,
      effective_from: dto.effective_from ?? null,
      effective_to: dto.effective_to ?? null,
      created_by: this.actorId(auth),
    } satisfies DeepPartial<Scheme>);

    try {
      const saved = await this.schemeRepo.save(row);
      return saved;
    } catch (e: any) {
      if (e?.code === '23505')
        throw new ConflictException('Scheme code already exists');
      throw e;
    }
  }

  async listSchemes(auth: AuthUser, dto: ListSchemeDto) {
    const qb = this.schemeRepo
      .createQueryBuilder('s')
      .where('s.company_id=:cid', { cid: auth.company_id })
      .andWhere('s.deleted_at IS NULL');

    if (dto.scheme_type) qb.andWhere('s.scheme_type=:t', { t: dto.scheme_type });
    if (dto.distributor_id)
      qb.andWhere('s.distributor_id=:d', { d: dto.distributor_id });

    if (dto.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('s.code ILIKE :q', { q: `%${dto.q}%` }).orWhere(
            's.name ILIKE :q',
            { q: `%${dto.q}%` },
          );
        }),
      );
    }

    qb.orderBy('s.priority', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .skip((dto.page - 1) * dto.limit)
      .take(dto.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { page: dto.page, limit: dto.limit, total, rows };
  }

  async getScheme(auth: AuthUser, id: string) {
    const s = await this.schemeRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!s) throw new NotFoundException('Scheme not found');

    const rules = await this.ruleRepo
      .createQueryBuilder('r')
      .select([
        'r.id AS id',
        'r.scheme_id AS scheme_id',
        'r.buy_sku_id AS buy_sku_id',
        'bsku.code AS buy_sku_code',
        'bsku.name AS buy_sku_name',
        'r.min_qty AS min_qty',
        'r.min_amount AS min_amount',
        'r.free_sku_id AS free_sku_id',
        'fsku.code AS free_sku_code',
        'fsku.name AS free_sku_name',
        'r.free_qty AS free_qty',
        'r.discount_percent AS discount_percent',
        'r.discount_amount AS discount_amount',
        'r.sort_order AS sort_order',
      ])
      .leftJoin('r.buy_sku', 'bsku')
      .leftJoin('r.free_sku', 'fsku')
      .where('r.company_id=:cid', { cid: auth.company_id })
      .andWhere('r.scheme_id=:sid', { sid: id })
      .andWhere('r.deleted_at IS NULL')
      .orderBy('r.sort_order', 'ASC')
      .addOrderBy('r.id', 'ASC')
      .getRawMany();

    return { ...s, rules };
  }

  async updateScheme(auth: AuthUser, id: string, dto: UpdateSchemeDto) {
    ensureDateOrder(dto.effective_from ?? null, dto.effective_to ?? null);

    const s = await this.schemeRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!s) throw new NotFoundException('Scheme not found');

    if (dto.name !== undefined) s.name = normalizeName(dto.name);
    if (dto.scheme_type !== undefined) s.scheme_type = dto.scheme_type as any;
    if (dto.priority !== undefined) s.priority = dto.priority;
    if (dto.can_stack !== undefined) s.can_stack = dto.can_stack;

    if (dto.distributor_id !== undefined) s.distributor_id = dto.distributor_id ?? null;
    if (dto.outlet_type !== undefined) s.outlet_type = (dto.outlet_type ?? null) as any;
    if (dto.org_node_id !== undefined) s.org_node_id = dto.org_node_id ?? null;

    if (dto.status !== undefined) s.status = dto.status as any;
    if (dto.effective_from !== undefined) s.effective_from = dto.effective_from ?? null;
    if (dto.effective_to !== undefined) s.effective_to = dto.effective_to ?? null;

    s.updated_by = this.actorId(auth);
    await this.schemeRepo.save(s);

    return { id: s.id };
  }

  async softDeleteScheme(auth: AuthUser, id: string) {
    const s = await this.schemeRepo.findOne({
      where: { id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!s) throw new NotFoundException('Scheme not found');

    s.deleted_at = new Date();
    s.deleted_by = this.actorId(auth);
    return await this.schemeRepo.save(s);
  }

  // ---------------- Bulk Import: PriceList + Items + Scopes ----------------

  async bulkImportPriceList(auth: AuthUser, dto: BulkImportPriceListDto) {
    const wb = await loadWorkbookFromBase64(dto.file_base64);

    const wsPL = wb.getWorksheet(dto.sheet_price_list ?? 'price_list');
    const wsItem = wb.getWorksheet(dto.sheet_item ?? 'price_list_item');
    const wsScope = wb.getWorksheet(dto.sheet_scope ?? 'price_list_scope');

    if (!wsPL && !wsItem && !wsScope) {
      throw new BadRequestException(
        'No expected sheets found (price_list / price_list_item / price_list_scope)',
      );
    }

    const plRows = wsPL ? sheetToObjects(wsPL) : [];
    const itemRows = wsItem ? sheetToObjects(wsItem) : [];
    const scopeRows = wsScope ? sheetToObjects(wsScope) : [];

    return this.ds.transaction(async (m) => {
      const plRepo = m.getRepository(PriceList);
      const itemRepo = m.getRepository(PriceListItem);
      const scopeRepo = m.getRepository(PriceListScope);
      const skuRepo = m.getRepository(MdSku);
      const distRepo = m.getRepository(MdDistributor);

      const byCode = new Map<string, PriceList>();

      // 1) upsert price_list by code
      for (const r of plRows) {
        const code = normalizeCode(cellStr(r['code']) ?? '');
        const name = normalizeName(cellStr(r['name']) ?? '');
        const typeNum = Number(cellStr(r['price_list_type']) ?? 0);
        if (!code) throw new BadRequestException('price_list.code is required');
        if (!name)
          throw new BadRequestException(`price_list.name is required for code=${code}`);
        if (!typeNum)
          throw new BadRequestException(`price_list_type is required for code=${code}`);

        const status = Number(cellStr(r['status']) ?? String(Status.ACTIVE));
        const effective_from = cellDateISO(r['effective_from']) ?? null;
        const effective_to = cellDateISO(r['effective_to']) ?? null;
        ensureDateOrder(effective_from, effective_to);

        let plEntity = await plRepo.findOne({
          where: { company_id: auth.company_id, code, deleted_at: null } as any,
        });

        if (!plEntity) {
          plEntity = plRepo.create({
            company_id: auth.company_id,
            code,
            name,
            price_list_type: typeNum as any,
            remarks: cellStr(r['remarks']) ?? null,
            status: status as any,
            effective_from,
            effective_to,
            created_by: this.actorId(auth),
          } satisfies DeepPartial<PriceList>);
        } else {
          plEntity.name = name;
          plEntity.price_list_type = typeNum as any;
          plEntity.remarks = cellStr(r['remarks']) ?? plEntity.remarks ?? null;
          plEntity.status = status as any;
          plEntity.effective_from = effective_from;
          plEntity.effective_to = effective_to;
          plEntity.updated_by = this.actorId(auth);
        }

        try {
          plEntity = await plRepo.save(plEntity);
        } catch (e: any) {
          if (e?.code === '23505')
            throw new ConflictException(`Duplicate price_list code: ${code}`);
          throw e;
        }

        byCode.set(code, plEntity);
      }

      // 2) preload skus used by item rows
      const skuCodes = Array.from(
        new Set(
          itemRows
            .map((x) => normalizeCode(cellStr(x['sku_code']) ?? ''))
            .filter(Boolean),
        ),
      );

      const skuMap = new Map<string, MdSku>();
      if (skuCodes.length) {
        const skus = await skuRepo.find({
          where: skuCodes.map(
            (c) => ({ company_id: auth.company_id, code: c, deleted_at: null } as any),
          ),
          take: skuCodes.length,
        });
        for (const s of skus) skuMap.set(s.code, s);
      }

      // 2) upsert items (and overlap check)
      for (const r of itemRows) {
        const plCode = normalizeCode(cellStr(r['price_list_code']) ?? '');
        const skuCode = normalizeCode(cellStr(r['sku_code']) ?? '');
        if (!plCode) throw new BadRequestException('price_list_item.price_list_code is required');
        if (!skuCode) throw new BadRequestException('price_list_item.sku_code is required');

        const pl =
          byCode.get(plCode) ??
          (await plRepo.findOne({
            where: { company_id: auth.company_id, code: plCode, deleted_at: null } as any,
          }));

        if (!pl) throw new BadRequestException(`Invalid price_list_code: ${plCode}`);

        const sku = skuMap.get(skuCode);
        if (!sku) throw new BadRequestException(`Invalid sku_code: ${skuCode}`);

        const effective_from = cellDateISO(r['effective_from']) ?? null;
        const effective_to = cellDateISO(r['effective_to']) ?? null;
        ensureDateOrder(effective_from, effective_to);

        const status = Number(cellStr(r['status']) ?? String(Status.ACTIVE));

        const existing = await itemRepo.find({
          where: {
            company_id: auth.company_id,
            price_list_id: pl.id as any,
            sku_id: sku.id as any,
            deleted_at: null,
          } as any,
          take: 5000,
        });

        for (const ex of existing) {
          if ((ex.effective_from ?? null) === effective_from) continue;
          if (
            rangesOverlap(
              ex.effective_from ?? null,
              ex.effective_to ?? null,
              effective_from,
              effective_to,
            )
          ) {
            throw new ConflictException(
              `PriceListItem overlap: price_list=${plCode}, sku=${skuCode} overlaps existing effective range`,
            );
          }
        }

        let itemEntity = await itemRepo.findOne({
          where: {
            company_id: auth.company_id,
            price_list_id: pl.id as any,
            sku_id: sku.id as any,
            effective_from: effective_from as any,
            deleted_at: null,
          } as any,
        });

        if (!itemEntity) {
          itemEntity = itemRepo.create({
            company_id: auth.company_id,
            price_list_id: pl.id as any,
            sku_id: sku.id as any,
            mrp: cellNum(r['mrp']),
            tp: cellNum(r['tp']),
            dp: cellNum(r['dp']),
            vat_rate: cellNum(r['vat_rate']) ?? '0',
            status: status as any,
            effective_from,
            effective_to,
            created_by: this.actorId(auth),
          } satisfies DeepPartial<PriceListItem>);
        } else {
          itemEntity.mrp = cellNum(r['mrp']);
          itemEntity.tp = cellNum(r['tp']);
          itemEntity.dp = cellNum(r['dp']);
          itemEntity.vat_rate = cellNum(r['vat_rate']) ?? itemEntity.vat_rate ?? '0';
          itemEntity.status = status as any;
          itemEntity.effective_to = effective_to;
          itemEntity.updated_by = this.actorId(auth);
        }

        await itemRepo.save(itemEntity);
      }

      // 3) preload distributors used by scope rows
      const distCodes = Array.from(
        new Set(
          scopeRows
            .map((x) => normalizeCode(cellStr(x['distributor_code']) ?? ''))
            .filter(Boolean),
        ),
      );

      const distMap = new Map<string, MdDistributor>();
      if (distCodes.length) {
        const dists = await distRepo.find({
          where: distCodes.map(
            (c) => ({ company_id: auth.company_id, code: c, deleted_at: null } as any),
          ),
          take: distCodes.length,
        });
        for (const d of dists) distMap.set(d.code, d);
      }

      // 3) upsert scopes by your unique key
      for (const r of scopeRows) {
        const plCode = normalizeCode(cellStr(r['price_list_code']) ?? '');
        if (!plCode) throw new BadRequestException('price_list_scope.price_list_code is required');

        const pl =
          byCode.get(plCode) ??
          (await plRepo.findOne({
            where: { company_id: auth.company_id, code: plCode, deleted_at: null } as any,
          }));

        if (!pl) throw new BadRequestException(`Invalid price_list_code: ${plCode}`);

        const distCode = normalizeCode(cellStr(r['distributor_code']) ?? '');
        const distributor_id = distCode ? distMap.get(distCode)?.id ?? null : null;
        if (distCode && !distributor_id)
          throw new BadRequestException(`Invalid distributor_code: ${distCode}`);

        const outlet_type_raw = cellStr(r['outlet_type']);
        const outlet_type = outlet_type_raw ? Number(outlet_type_raw) : null;

        const org_node_id = cellStr(r['org_node_id']) ?? null;

        const effective_from = cellDateISO(r['effective_from']) ?? null;
        const effective_to = cellDateISO(r['effective_to']) ?? null;
        ensureDateOrder(effective_from, effective_to);

        const status = Number(cellStr(r['status']) ?? String(Status.ACTIVE));

        let scopeEntity = await scopeRepo.findOne({
          where: {
            company_id: auth.company_id,
            price_list_id: pl.id as any,
            distributor_id: (distributor_id ?? null) as any,
            outlet_type: (outlet_type ?? null) as any,
            org_node_id: (org_node_id ?? null) as any,
            effective_from: effective_from as any,
            deleted_at: null,
          } as any,
        });

        if (!scopeEntity) {
          scopeEntity = scopeRepo.create({
            company_id: auth.company_id,
            price_list_id: pl.id as any,
            distributor_id: distributor_id as any,
            outlet_type: (outlet_type ?? null) as any,
            org_node_id,
            status: status as any,
            effective_from,
            effective_to,
            created_by: this.actorId(auth),
          } satisfies DeepPartial<PriceListScope>);
        } else {
          scopeEntity.status = status as any;
          scopeEntity.effective_to = effective_to;
          scopeEntity.updated_by = this.actorId(auth);
        }

        try {
          await scopeRepo.save(scopeEntity);
        } catch (e: any) {
          if (e?.code === '23505')
            throw new ConflictException(`Duplicate scope row for price_list=${plCode}`);
          throw e;
        }
      }

      return {
          imported_price_lists: plRows.length,
          imported_items: itemRows.length,
          imported_scopes: scopeRows.length,
        };
    });
  }

  // ---------------- Bulk Import: Scheme + Rules ----------------

  async bulkImportScheme(auth: AuthUser, dto: BulkImportSchemeDto) {
    const wb = await loadWorkbookFromBase64(dto.file_base64);
    const wsS = wb.getWorksheet(dto.sheet_scheme ?? 'scheme');
    const wsR = wb.getWorksheet(dto.sheet_rule ?? 'scheme_rule');

    if (!wsS && !wsR) throw new BadRequestException('No expected sheets found (scheme / scheme_rule)');

    const schemeRows = wsS ? sheetToObjects(wsS) : [];
    const ruleRows = wsR ? sheetToObjects(wsR) : [];

    return this.ds.transaction(async (m) => {
      const schemeRepo = m.getRepository(Scheme);
      const ruleRepo = m.getRepository(SchemeRule);
      const skuRepo = m.getRepository(MdSku);
      const distRepo = m.getRepository(MdDistributor);

      // preload distributors referenced by scheme sheet
      const distCodes = Array.from(
        new Set(
          schemeRows
            .map((r) => normalizeCode(cellStr(r['distributor_code']) ?? ''))
            .filter(Boolean),
        ),
      );

      const distMap = new Map<string, MdDistributor>();
      if (distCodes.length) {
        const dists = await distRepo.find({
          where: distCodes.map(
            (c) => ({ company_id: auth.company_id, code: c, deleted_at: null } as any),
          ),
          take: distCodes.length,
        });
        for (const d of dists) distMap.set(d.code, d);
      }

      // upsert schemes by code
      const byCode = new Map<string, Scheme>();
      for (const r of schemeRows) {
        const code = normalizeCode(cellStr(r['code']) ?? '');
        const name = normalizeName(cellStr(r['name']) ?? '');
        const scheme_type = Number(cellStr(r['scheme_type']) ?? 0);

        if (!code) throw new BadRequestException('scheme.code is required');
        if (!name) throw new BadRequestException(`scheme.name is required for code=${code}`);
        if (!scheme_type) throw new BadRequestException(`scheme_type is required for code=${code}`);

        const distributor_code = normalizeCode(cellStr(r['distributor_code']) ?? '');
        const distributor_id = distributor_code ? distMap.get(distributor_code)?.id ?? null : null;
        if (distributor_code && !distributor_id)
          throw new BadRequestException(`Invalid distributor_code: ${distributor_code}`);

        const outlet_type_raw = cellStr(r['outlet_type']);
        const outlet_type = outlet_type_raw ? Number(outlet_type_raw) : null;
        const org_node_id = cellStr(r['org_node_id']) ?? null;

        const effective_from = cellDateISO(r['effective_from']) ?? null;
        const effective_to = cellDateISO(r['effective_to']) ?? null;
        ensureDateOrder(effective_from, effective_to);

        const status = Number(cellStr(r['status']) ?? String(Status.ACTIVE));
        const priority = Number(cellStr(r['priority']) ?? '0');
        const can_stack = (cellStr(r['can_stack']) ?? 'false').toLowerCase() === 'true';

        let schemeEntity = await schemeRepo.findOne({
          where: { company_id: auth.company_id, code, deleted_at: null } as any,
        });

        if (!schemeEntity) {
          schemeEntity = schemeRepo.create({
            company_id: auth.company_id,
            code,
            name,
            scheme_type: scheme_type as any,
            priority,
            can_stack,
            distributor_id: distributor_id as any,
            outlet_type: (outlet_type ?? null) as any,
            org_node_id,
            status: status as any,
            effective_from,
            effective_to,
            created_by: this.actorId(auth),
          } satisfies DeepPartial<Scheme>);
        } else {
          schemeEntity.name = name;
          schemeEntity.scheme_type = scheme_type as any;
          schemeEntity.priority = priority;
          schemeEntity.can_stack = can_stack;
          schemeEntity.distributor_id = distributor_id as any;
          schemeEntity.outlet_type = (outlet_type ?? null) as any;
          schemeEntity.org_node_id = org_node_id;
          schemeEntity.status = status as any;
          schemeEntity.effective_from = effective_from;
          schemeEntity.effective_to = effective_to;
          schemeEntity.updated_by = this.actorId(auth);
        }

        try {
          schemeEntity = await schemeRepo.save(schemeEntity);
        } catch (e: any) {
          if (e?.code === '23505') throw new ConflictException(`Duplicate scheme code: ${code}`);
          throw e;
        }

        byCode.set(code, schemeEntity);
      }

      // preload SKUs used in rules
      const skuCodes = Array.from(
        new Set(
          ruleRows
            .flatMap((r) => [cellStr(r['buy_sku_code']), cellStr(r['free_sku_code'])])
            .map((x) => normalizeCode(x ?? ''))
            .filter(Boolean),
        ),
      );

      const skuMap = new Map<string, MdSku>();
      if (skuCodes.length) {
        const skus = await skuRepo.find({
          where: skuCodes.map(
            (c) => ({ company_id: auth.company_id, code: c, deleted_at: null } as any),
          ),
          take: skuCodes.length,
        });
        for (const s of skus) skuMap.set(s.code, s);
      }

      // upsert rules by (scheme_id, sort_order)
      for (const r of ruleRows) {
        const scheme_code = normalizeCode(cellStr(r['scheme_code']) ?? '');
        if (!scheme_code) throw new BadRequestException('scheme_rule.scheme_code is required');

        const scheme =
          byCode.get(scheme_code) ??
          (await schemeRepo.findOne({
            where: { company_id: auth.company_id, code: scheme_code, deleted_at: null } as any,
          }));

        if (!scheme) throw new BadRequestException(`Invalid scheme_code: ${scheme_code}`);

        const sort_order = Number(cellStr(r['sort_order']) ?? '0');

        const buySkuCode = normalizeCode(cellStr(r['buy_sku_code']) ?? '');
        const freeSkuCode = normalizeCode(cellStr(r['free_sku_code']) ?? '');

        const buy_sku_id = buySkuCode ? skuMap.get(buySkuCode)?.id ?? null : null;
        const free_sku_id = freeSkuCode ? skuMap.get(freeSkuCode)?.id ?? null : null;

        if (buySkuCode && !buy_sku_id) throw new BadRequestException(`Invalid buy_sku_code: ${buySkuCode}`);
        if (freeSkuCode && !free_sku_id) throw new BadRequestException(`Invalid free_sku_code: ${freeSkuCode}`);

        const free_qty = cellNum(r['free_qty']);
        const discount_percent = cellNum(r['discount_percent']);
        const discount_amount = cellNum(r['discount_amount']);

        const hasReward =
          (free_sku_id && free_qty && Number(free_qty) > 0) ||
          (discount_percent && Number(discount_percent) > 0) ||
          (discount_amount && Number(discount_amount) > 0);

        if (!hasReward)
          throw new BadRequestException(
            `SchemeRule missing reward: scheme=${scheme_code}, sort_order=${sort_order}`,
          );

        const min_qty = cellNum(r['min_qty']);
        const min_amount = cellNum(r['min_amount']);
        if (!min_qty && !min_amount)
          throw new BadRequestException(
            `SchemeRule missing threshold (min_qty/min_amount): scheme=${scheme_code}`,
          );

        let ruleEntity = await ruleRepo.findOne({
          where: {
            company_id: auth.company_id,
            scheme_id: scheme.id as any,
            sort_order,
            deleted_at: null,
          } as any,
        });

        if (!ruleEntity) {
          ruleEntity = ruleRepo.create({
            company_id: auth.company_id,
            scheme_id: scheme.id as any,
            buy_sku_id: buy_sku_id as any,
            min_qty,
            min_amount,
            free_sku_id: free_sku_id as any,
            free_qty,
            discount_percent,
            discount_amount,
            sort_order,
            created_by: this.actorId(auth),
          } satisfies DeepPartial<SchemeRule>);
        } else {
          ruleEntity.buy_sku_id = buy_sku_id as any;
          ruleEntity.min_qty = min_qty;
          ruleEntity.min_amount = min_amount;
          ruleEntity.free_sku_id = free_sku_id as any;
          ruleEntity.free_qty = free_qty;
          ruleEntity.discount_percent = discount_percent;
          ruleEntity.discount_amount = discount_amount;
          ruleEntity.updated_by = this.actorId(auth);
        }

        await ruleRepo.save(ruleEntity);
      }

      return { imported_schemes: schemeRows.length, imported_rules: ruleRows.length };
    });
  }

  // ---------------- Resolve Best Price ----------------

  async resolveBestPrice(auth: AuthUser, dto: ResolvePriceDto) {
    this.assertISODate(dto.date);

    // sku resolve
    let skuId = dto.sku_id ?? null;
    if (!skuId && dto.sku_code) {
      const sku = await this.skuRepo.findOne({
        where: {
          company_id: auth.company_id,
          code: dto.sku_code.trim(),
          deleted_at: null,
        } as any,
      });
      if (!sku) throw new BadRequestException(`Invalid sku_code: ${dto.sku_code}`);
      skuId = sku.id;
    }
    if (!skuId) throw new BadRequestException('sku_id or sku_code is required');

    const pls = await this.priceListRepo.find({
      where: { company_id: auth.company_id, deleted_at: null } as any,
      order: { id: 'DESC' as any },
    });

    const validPLs = pls.filter(
      (pl) =>
        pl.status === Status.ACTIVE &&
        this.dateInRange(dto.date, pl.effective_from ?? null, pl.effective_to ?? null),
    );

    const scopes = await this.scopeRepo.find({
      where: { company_id: auth.company_id, deleted_at: null } as any,
      order: { effective_from: 'DESC' as any, id: 'DESC' as any },
    });

    const items = await this.itemRepo.find({
      where: { company_id: auth.company_id, sku_id: skuId as any, deleted_at: null } as any,
      order: { effective_from: 'DESC' as any, id: 'DESC' as any },
    });

    const validItems = items.filter(
      (it) =>
        it.status === Status.ACTIVE &&
        this.dateInRange(dto.date, it.effective_from ?? null, it.effective_to ?? null),
    );

    type Candidate = {
      price_list: PriceList;
      scope: PriceListScope | null;
      item: PriceListItem;
      score: number;
    };

    const candidates: Candidate[] = [];

    for (const pl of validPLs) {
      const item = validItems.find((x) => x.price_list_id === pl.id);
      if (!item) continue;

      // DEFAULT list (type=1) allowed without scopes
      if (pl.price_list_type === 1) {
        candidates.push({ price_list: pl, scope: null, item, score: 0 });
        continue;
      }

      const srows = scopes
        .filter((s) => s.price_list_id === pl.id)
        .filter((s) => s.status === Status.ACTIVE)
        .filter((s) => this.dateInRange(dto.date, s.effective_from ?? null, s.effective_to ?? null))
        .filter((s) => {
          if (s.distributor_id && dto.distributor_id && s.distributor_id !== dto.distributor_id) return false;
          if (s.distributor_id && !dto.distributor_id) return false;

          if (s.org_node_id && dto.org_node_id && s.org_node_id !== dto.org_node_id) return false;
          if (s.org_node_id && !dto.org_node_id) return false;

          if (s.outlet_type !== null && s.outlet_type !== undefined) {
            if (dto.outlet_type === undefined || dto.outlet_type === null) return false;
            if (Number(s.outlet_type) !== Number(dto.outlet_type)) return false;
          }
          return true;
        });

      for (const s of srows) {
        const score = this.scoreScope({
          distributor_id: dto.distributor_id,
          outlet_type: dto.outlet_type,
          org_node_id: dto.org_node_id,
          scope_distributor_id: s.distributor_id ?? null,
          scope_outlet_type: (s.outlet_type ?? null) as any,
          scope_org_node_id: s.org_node_id ?? null,
        });

        candidates.push({ price_list: pl, scope: s, item, score });
      }
    }

    if (!candidates.length) {
      return { success: true, message: 'OK', data: { sku_id: skuId, date: dto.date, found: false } };
    }

    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aS = a.scope?.effective_from ?? '0000-01-01';
      const bS = b.scope?.effective_from ?? '0000-01-01';
      if (bS !== aS) return bS.localeCompare(aS);
      const aI = a.item.effective_from ?? '0000-01-01';
      const bI = b.item.effective_from ?? '0000-01-01';
      if (bI !== aI) return bI.localeCompare(aI);
      return Number(b.price_list.id) - Number(a.price_list.id);
    });

    const best = candidates[0];

    return {
        found: true,
        sku_id: skuId,
        date: dto.date,
        price_list: {
          id: best.price_list.id,
          code: best.price_list.code,
          name: best.price_list.name,
          price_list_type: best.price_list.price_list_type,
        },
        scope: best.scope
          ? {
              id: best.scope.id,
              distributor_id: best.scope.distributor_id,
              outlet_type: best.scope.outlet_type,
              org_node_id: best.scope.org_node_id,
              effective_from: best.scope.effective_from,
              effective_to: best.scope.effective_to,
            }
          : null,
        item: {
          id: best.item.id,
          mrp: best.item.mrp,
          tp: best.item.tp,
          dp: best.item.dp,
          vat_rate: best.item.vat_rate,
          effective_from: best.item.effective_from,
          effective_to: best.item.effective_to,
        },
    };
  }
  // ---------------- Apply Schemes ----------------

  async applySchemesToOrder(auth: AuthUser, dto: ApplySchemeDto) {
    this.assertISODate(dto.date);

    const schemes = await this.schemeRepo.find({
      where: { company_id: auth.company_id, deleted_at: null } as any,
      order: { priority: 'DESC' as any, id: 'DESC' as any },
    });

    const validSchemes = schemes
      .filter((s) => s.status === Status.ACTIVE)
      .filter((s) => this.dateInRange(dto.date, s.effective_from ?? null, s.effective_to ?? null))
      .filter((s) => {
        if (s.distributor_id && dto.distributor_id !== s.distributor_id) return false;
        if (s.distributor_id && !dto.distributor_id) return false;

        if (s.org_node_id && dto.org_node_id !== s.org_node_id) return false;
        if (s.org_node_id && !dto.org_node_id) return false;

        if (s.outlet_type !== null && s.outlet_type !== undefined) {
          if (dto.outlet_type === undefined || dto.outlet_type === null) return false;
          if (Number(s.outlet_type) !== Number(dto.outlet_type)) return false;
        }
        return true;
      });

    const schemeIds = validSchemes.map((x) => x.id);
    const rules = schemeIds.length
      ? await this.ruleRepo.find({
          where: schemeIds.map((sid) => ({ company_id: auth.company_id, scheme_id: sid, deleted_at: null } as any)),
          order: { sort_order: 'ASC' as any, id: 'ASC' as any },
        })
      : [];

    const rulesByScheme = new Map<string, SchemeRule[]>();
    for (const r of rules) rulesByScheme.set(r.scheme_id, [...(rulesByScheme.get(r.scheme_id) ?? []), r]);

    const lineResults = dto.lines.map((l) => ({
      sku_id: l.sku_id,
      qty: Number(l.qty),
      unit_price: Number(l.unit_price),
      line_amount: Number(l.qty) * Number(l.unit_price),
      discount_amount: 0,
    }));

    const freeItems: Array<{ sku_id: string; qty: number; source_scheme_code: string }> = [];
    const applied: Array<{ scheme_id: string; scheme_code: string; rule_id: string }> = [];

    const orderTotal = lineResults.reduce((a, b) => a + b.line_amount, 0);
    const lineBySku = new Map(lineResults.map((x) => [x.sku_id, x]));

    for (const s of validSchemes) {
      const sRules = rulesByScheme.get(s.id) ?? [];

      for (const r of sRules) {
        const line = r.buy_sku_id ? lineBySku.get(r.buy_sku_id) : null;
        const qty = line ? line.qty : dto.lines.reduce((a, b) => a + Number(b.qty), 0);
        const amount = line ? line.line_amount : orderTotal;

        if (r.min_qty && qty < Number(r.min_qty)) continue;
        if (r.min_amount && amount < Number(r.min_amount)) continue;

        if (r.free_sku_id && r.free_qty && Number(r.free_qty) > 0) {
          freeItems.push({ sku_id: r.free_sku_id, qty: Number(r.free_qty), source_scheme_code: s.code });
        }

        if (r.discount_percent && Number(r.discount_percent) > 0) {
          const disc = (amount * Number(r.discount_percent)) / 100;
          if (line) line.discount_amount += disc;
          else {
            const base = orderTotal || 1;
            for (const lr of lineResults) lr.discount_amount += (lr.line_amount / base) * disc;
          }
        }

        if (r.discount_amount && Number(r.discount_amount) > 0) {
          const disc = Number(r.discount_amount);
          if (line) line.discount_amount += disc;
          else {
            const base = orderTotal || 1;
            for (const lr of lineResults) lr.discount_amount += (lr.line_amount / base) * disc;
          }
        }

        applied.push({ scheme_id: s.id, scheme_code: s.code, rule_id: r.id });

        if (!s.can_stack) {
          const discTotal = lineResults.reduce((a, b) => a + b.discount_amount, 0);
          return {
            success: true,
            message: 'OK',
            data: {
              applied_schemes: applied,
              lines: lineResults.map((x) => ({ ...x, net_amount: x.line_amount - x.discount_amount })),
              free_items: freeItems,
              summary: { gross: orderTotal, discount: discTotal, net: orderTotal - discTotal },
            },
          };
        }
      }
    }

    const discTotal = lineResults.reduce((a, b) => a + b.discount_amount, 0);
    return {
        applied_schemes: applied,
        lines: lineResults.map((x) => ({ ...x, net_amount: x.line_amount - x.discount_amount })),
        free_items: freeItems,
        summary: { gross: orderTotal, discount: discTotal, net: orderTotal - discTotal },
    };
  }
async upsertPriceListItems(
  auth: AuthUser,
  priceListId: string,
  dto: { mode?: 'replace' | 'upsert'; items: any[] },
) {
  const mode: 'replace' | 'upsert' = (dto?.mode ?? 'replace') as any;
  const items = Array.isArray(dto?.items) ? dto.items : [];
  if (!items.length) throw new BadRequestException('items is required');

  const pl = await this.priceListRepo.findOne({
    where: { id: priceListId, company_id: auth.company_id, deleted_at: null } as any,
  });
  if (!pl) throw new NotFoundException('Price list not found');

  const normDate = (v: any): string | null => {
    if (v === undefined || v === null) return null;
    const s = String(v).trim();
    return s ? s : null;
  };

  // returns:
  // - undefined => "not provided" (so keep old)
  // - null      => explicitly clear (if you allow)
  // - string    => value
  //
  // In this implementation:
  // - undefined OR '' => undefined (keep old)
  // - any numeric string => string
  const normNumStrOptional = (v: any, field: string): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    if (s === '') return undefined;
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new BadRequestException(`${field} must be a number`);
    return s;
  };

  // same idea for vat: if not provided -> keep old
  const normVatOptional = (v: any): string | undefined => {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim();
    if (s === '') return undefined;
    if (!/^-?\d+(\.\d+)?$/.test(s)) throw new BadRequestException(`vat_rate must be a number`);
    return s;
  };

  return this.ds.transaction(async (m) => {
    const itemRepo = m.getRepository(PriceListItem);
    const skuRepo = m.getRepository(MdSku);

    // preload SKUs
    const skuIds = Array.from(
      new Set(items.map((x) => String(x.sku_id ?? '').trim()).filter(Boolean)),
    );
    if (!skuIds.length) throw new BadRequestException('items[].sku_id is required');

    const skus = await skuRepo.find({
      where: skuIds.map((id) => ({ id, company_id: auth.company_id, deleted_at: null } as any)),
      take: skuIds.length,
    });
    const skuMap = new Map(skus.map((s) => [String(s.id), s]));
    if (skus.length !== skuIds.length) {
      const missing = skuIds.filter((id) => !skuMap.has(id));
      throw new BadRequestException(`Invalid sku_id: ${missing.slice(0, 30).join(', ')}`);
    }

    // REPLACE: soft-delete all active rows first
    if (mode === 'replace') {
      await itemRepo
        .createQueryBuilder()
        .update(PriceListItem)
        .set({ deleted_at: new Date(), deleted_by: this.actorId(auth) } as any)
        .where('company_id=:cid', { cid: auth.company_id })
        .andWhere('price_list_id=:plid', { plid: priceListId })
        .andWhere('deleted_at IS NULL')
        .execute();
    }

    // load ALL rows for this price list + sku_ids (including deleted)
    const existingAll = await itemRepo.find({
      where: skuIds.map((sid) => ({
        company_id: auth.company_id,
        price_list_id: priceListId as any,
        sku_id: sid as any,
      })) as any,
      take: 200000,
      // NOTE: remove withDeleted if your project doesn't support it
      withDeleted: true as any,
    });

    const byKey = new Map<string, PriceListItem>();
    for (const ex of existingAll) {
      const key = `${ex.price_list_id}__${ex.sku_id}__${ex.effective_from ?? ''}`;
      byKey.set(key, ex);
    }

    // validate overlap inside payload (same sku)
    const rangesBySku = new Map<string, Array<{ ef: string; et: string | null }>>();
    for (const it of items) {
      const sku_id = String(it.sku_id).trim();
      const ef = normDate(it.effective_from);
      const et = normDate(it.effective_to);

      if (!ef) throw new BadRequestException(`effective_from is required for sku_id=${sku_id}`);
      this.assertISODate(ef);
      if (et) this.assertISODate(et);
      ensureDateOrder(ef, et);

      const list = rangesBySku.get(sku_id) ?? [];
      for (const ex of list) {
        if (rangesOverlap(ex.ef, ex.et, ef, et)) {
          throw new ConflictException(`Payload overlap for sku_id=${sku_id}`);
        }
      }
      list.push({ ef, et });
      rangesBySku.set(sku_id, list);
    }

    // For upsert mode, check DB overlaps (excluding same effective_from record)
    if (mode === 'upsert') {
      for (const [sku_id, ranges] of rangesBySku.entries()) {
        const dbRows = await itemRepo.find({
          where: {
            company_id: auth.company_id,
            price_list_id: priceListId as any,
            sku_id: sku_id as any,
            deleted_at: null,
          } as any,
          take: 5000,
        });

        for (const db of dbRows) {
          for (const r of ranges) {
            if ((db.effective_from ?? null) === r.ef) continue;
            if (rangesOverlap(db.effective_from ?? null, db.effective_to ?? null, r.ef, r.et)) {
              throw new ConflictException(`Overlap with existing item for sku_id=${sku_id}`);
            }
          }
        }
      }
    }

    // revive/update or insert
    let saved = 0;

    for (const it of items) {
      const sku_id = String(it.sku_id).trim();
      const ef = normDate(it.effective_from)!;
      const et = normDate(it.effective_to);

      const key = `${priceListId}__${sku_id}__${ef}`;
      const ex = byKey.get(key);

      // parse optional numeric fields
      const mrpOpt = normNumStrOptional(it.mrp, 'mrp');
      const tpOpt = normNumStrOptional(it.tp, 'tp');
      const dpOpt = normNumStrOptional(it.dp, 'dp');
      const vatOpt = normVatOptional(it.vat_rate);

      // status/effective_to: if not provided, keep old for update; for insert, default status active.
      const statusProvided = it.status !== undefined && it.status !== null && String(it.status).trim() !== '';
      const statusVal = statusProvided ? (it.status as any) : undefined;

      if (ex) {
        // revive if previously deleted
        ex.deleted_at = null as any;
        ex.deleted_by = null as any;

        // only overwrite if provided
        if (mrpOpt !== undefined) ex.mrp = mrpOpt as any;
        if (tpOpt !== undefined) ex.tp = tpOpt as any;
        if (dpOpt !== undefined) ex.dp = dpOpt as any;
        if (vatOpt !== undefined) ex.vat_rate = vatOpt as any;

        if (statusVal !== undefined) ex.status = statusVal;
        if (it.effective_to !== undefined) ex.effective_to = et as any; // only change if field exists

        ex.updated_by = this.actorId(auth) as any;
        await itemRepo.save(ex);
      } else {
        // insert new row
        const row = itemRepo.create({
          company_id: auth.company_id,
          price_list_id: priceListId as any,
          sku_id: sku_id as any,
          effective_from: ef as any,

          // for insert: set only if provided, otherwise null
          mrp: mrpOpt ?? null,
          tp: tpOpt ?? null,
          dp: dpOpt ?? null,
          vat_rate: vatOpt ?? '0',

          status: (statusVal ?? Status.ACTIVE) as any,
          effective_to: et as any,

          deleted_at: null,
          deleted_by: null,
          created_by: this.actorId(auth),
        } as any);

        await itemRepo.save(row);
      }

      saved++;
    }

    return {
      success: true,
      message: 'OK',
      data: { price_list_id: priceListId, mode, saved },
    };
  });
}


async createPriceListScope(auth: AuthUser, priceListId: string, dto: any) {
  if (dto.effective_from) this.assertISODate(dto.effective_from);
  if (dto.effective_to) this.assertISODate(dto.effective_to);

  const pl = await this.priceListRepo.findOne({
    where: { id: priceListId, company_id: auth.company_id, deleted_at: null } as any,
  });
  if (!pl) throw new NotFoundException('Price list not found');

  if (dto.distributor_id) {
    const d = await this.distRepo.findOne({
      where: { id: dto.distributor_id, company_id: auth.company_id, deleted_at: null } as any,
    });
    if (!d) throw new BadRequestException('Invalid distributor_id');
  }

  const row = this.scopeRepo.create({
    company_id: auth.company_id,
    price_list_id: pl.id as any,
    distributor_id: dto.distributor_id ?? null,
    outlet_type: dto.outlet_type ?? null,
    org_node_id: dto.org_node_id ?? null,
    status: dto.status ?? Status.ACTIVE,
    effective_from: dto.effective_from ?? null,
    effective_to: dto.effective_to ?? null,
    created_by: this.actorId(auth),
  } as any);

  return await this.scopeRepo.save(row);
}
async createSchemeRule(auth: AuthUser, schemeId: string, dto: CreateSchemeRuleDto) {
  const scheme = await this.schemeRepo.findOne({
    where: { id: schemeId, company_id: auth.company_id, deleted_at: null } as any,
  });
  if (!scheme) throw new NotFoundException('Scheme not found');

  // basic threshold check
  if (!dto.min_qty && !dto.min_amount) {
    throw new BadRequestException('min_qty or min_amount is required');
  }

  // basic reward check
  const hasFree =
    dto.free_sku_id && dto.free_qty && Number(dto.free_qty) > 0;
  const hasDiscPct = dto.discount_percent && Number(dto.discount_percent) > 0;
  const hasDiscAmt = dto.discount_amount && Number(dto.discount_amount) > 0;

  if (!hasFree && !hasDiscPct && !hasDiscAmt) {
    throw new BadRequestException('Provide free item or discount reward');
  }

  // enforce unique (scheme_id, sort_order) if you want consistent ordering
  const existing = await this.ruleRepo.findOne({
    where: {
      company_id: auth.company_id,
      scheme_id: schemeId as any,
      sort_order: dto.sort_order as any,
      deleted_at: null,
    } as any,
  });
  if (existing) throw new ConflictException('sort_order already exists in this scheme');

  const row = this.ruleRepo.create({
    company_id: auth.company_id,
    scheme_id: schemeId as any,
    buy_sku_id: dto.buy_sku_id ?? null,
    min_qty: dto.min_qty ?? null,
    min_amount: dto.min_amount ?? null,
    free_sku_id: dto.free_sku_id ?? null,
    free_qty: dto.free_qty ?? null,
    discount_percent: dto.discount_percent ?? null,
    discount_amount: dto.discount_amount ?? null,
    sort_order: dto.sort_order,
    created_by: this.actorId(auth),
  } as any);

  const saved = await this.ruleRepo.save(row);
  return saved;
}

async updateSchemeRule(auth: AuthUser, schemeId: string, ruleId: string, dto: UpdateSchemeRuleDto) {
  const rule = await this.ruleRepo.findOne({
    where: { id: ruleId, company_id: auth.company_id, scheme_id: schemeId as any, deleted_at: null } as any,
  });
  if (!rule) throw new NotFoundException('Rule not found');

  Object.assign(rule, {
    buy_sku_id: dto.buy_sku_id ?? rule.buy_sku_id,
    min_qty: dto.min_qty ?? rule.min_qty,
    min_amount: dto.min_amount ?? rule.min_amount,
    free_sku_id: dto.free_sku_id ?? rule.free_sku_id,
    free_qty: dto.free_qty ?? rule.free_qty,
    discount_percent: dto.discount_percent ?? rule.discount_percent,
    discount_amount: dto.discount_amount ?? rule.discount_amount,
    sort_order: dto.sort_order ?? rule.sort_order,
  });

  // re-validate threshold + reward after patch
  if (!rule.min_qty && !rule.min_amount) throw new BadRequestException('min_qty or min_amount is required');
  const hasReward =
    (rule.free_sku_id && rule.free_qty && Number(rule.free_qty) > 0) ||
    (rule.discount_percent && Number(rule.discount_percent) > 0) ||
    (rule.discount_amount && Number(rule.discount_amount) > 0);
  if (!hasReward) throw new BadRequestException('Provide free item or discount reward');

  rule.updated_by = this.actorId(auth);
  await this.ruleRepo.save(rule);
  return { id: rule.id };
}

async softDeleteSchemeRule(auth: AuthUser, schemeId: string, ruleId: string) {
  const rule = await this.ruleRepo.findOne({
    where: { id: ruleId, company_id: auth.company_id, scheme_id: schemeId as any, deleted_at: null } as any,
  });
  if (!rule) throw new NotFoundException('Rule not found');

  rule.deleted_at = new Date();
  rule.deleted_by = this.actorId(auth);
  await this.ruleRepo.save(rule);
  return { id: rule.id };
}
/**
   * ✅ Resolve pricing context for "different user types"
   * Priority:
   * 1) dto overrides (query/body)
   * 2) md_user_scope (default for that user)
   */
  private async resolveContext(auth: AuthUser, dto: any): Promise<ResolvedContext> {
    const date = dto?.date ? String(dto.date) : this.ymdToday();
    this.assertISODate(date);

    const dtoDistributor = dto?.distributor_id ? String(dto.distributor_id) : null;
    const dtoOrg = dto?.org_node_id ? String(dto.org_node_id) : null;
    const dtoOutletType =
      dto?.outlet_type === 0 || dto?.outlet_type ? Number(dto.outlet_type) : null;

    const uid = this.actorId(auth);
    if (!uid) {
      return { date, distributor_id: dtoDistributor, org_node_id: dtoOrg, outlet_type: dtoOutletType };
    }

    const scopes = await this.userScopeRepo.find({
      where: { company_id: auth.company_id as any, user_id: uid as any } as any,
      order: { id: 'DESC' as any },
      take: 200,
    });

    const distScope = scopes.find((s) => Number(s.scope_type) === ScopeType.DISTRIBUTOR);
    const hierScope = scopes.find((s) => Number(s.scope_type) === ScopeType.HIERARCHY);

    const fallbackDistributor =
      distScope?.distributor_id ?? scopes.find((s) => !!s.distributor_id)?.distributor_id ?? null;

    const fallbackOrg =
      hierScope?.org_node_id ?? scopes.find((s) => !!s.org_node_id)?.org_node_id ?? null;

    // Distributor user: prefer forced distributor scope
    const isDistUser =
      Number(auth.user_type) === UserType.DISTRIBUTOR_USER ||
      Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER;

    const distributor_id = dtoDistributor ?? (isDistUser ? fallbackDistributor : fallbackDistributor);
    const org_node_id = dtoOrg ?? fallbackOrg;

    return { date, distributor_id: distributor_id ?? null, org_node_id: org_node_id ?? null, outlet_type: dtoOutletType };
  }

  // ============================================================
  // ✅ VISIBLE SKU LIST (SKU + Best Price)
  // ============================================================
  async listVisibleSkusWithBestPrice(auth: AuthUser, dto: any) {
    const ctx = await this.resolveContext(auth, dto);

    const page = Number(dto?.page ?? 1);
    const limit = Math.min(200, Math.max(1, Number(dto?.limit ?? 50)));
    const offset = (page - 1) * limit;
    const q = dto?.q ? String(dto.q).trim() : '';

    const sql = `
WITH candidates AS (
  SELECT
    sku.id AS sku_id,
    sku.code AS sku_code,
    sku.name AS sku_name,

    pl.id AS price_list_id,
    pl.code AS price_list_code,
    pl.name AS price_list_name,
    pl.price_list_type AS price_list_type,

    i.id AS item_id,
    i.mrp AS mrp,
    i.tp AS tp,
    i.dp AS dp,
    i.vat_rate AS vat_rate,
    i.effective_from AS item_effective_from,

    s.id AS scope_id,
    s.distributor_id AS scope_distributor_id,
    s.org_node_id AS scope_org_node_id,
    s.outlet_type AS scope_outlet_type,
    s.effective_from AS scope_effective_from,

    (CASE WHEN s.distributor_id IS NOT NULL AND s.distributor_id::text = COALESCE($2,'') THEN 100 ELSE 0 END) +
    (CASE WHEN s.org_node_id IS NOT NULL AND s.org_node_id::text = COALESCE($3,'') THEN 50 ELSE 0 END) +
    (CASE WHEN s.outlet_type IS NOT NULL AND s.outlet_type = $4 THEN 10 ELSE 0 END)
    AS score
  FROM md_sku sku

  JOIN md_price_list_item i
    ON i.company_id = sku.company_id
   AND i.sku_id = sku.id
   AND i.deleted_at IS NULL
   AND i.status = 1
   AND (i.effective_from IS NULL OR i.effective_from <= $1::date)
   AND (i.effective_to IS NULL OR i.effective_to >= $1::date)

  JOIN md_price_list pl
    ON pl.company_id = sku.company_id
   AND pl.id = i.price_list_id
   AND pl.deleted_at IS NULL
   AND pl.status = 1
   AND (pl.effective_from IS NULL OR pl.effective_from <= $1::date)
   AND (pl.effective_to IS NULL OR pl.effective_to >= $1::date)

  LEFT JOIN md_price_list_scope s
    ON s.company_id = pl.company_id
   AND s.price_list_id = pl.id
   AND s.deleted_at IS NULL
   AND s.status = 1
   AND (s.effective_from IS NULL OR s.effective_from <= $1::date)
   AND (s.effective_to IS NULL OR s.effective_to >= $1::date)

  WHERE sku.company_id = $5
    AND sku.deleted_at IS NULL
    AND sku.status = 1
    AND ($6 = '' OR sku.code ILIKE '%'||$6||'%' OR sku.name ILIKE '%'||$6||'%')
    AND (
      -- DEFAULT list always allowed
      pl.price_list_type = 1
      OR (
        -- scoped lists require a scope row that matches context
        s.id IS NOT NULL
        AND (s.distributor_id IS NULL OR s.distributor_id::text = COALESCE($2,''))
        AND (s.org_node_id IS NULL OR s.org_node_id::text = COALESCE($3,''))
        AND (s.outlet_type IS NULL OR s.outlet_type = $4)
      )
    )
),
best AS (
  SELECT DISTINCT ON (sku_id)
    *
  FROM candidates
  ORDER BY
    sku_id,
    score DESC,
    COALESCE(scope_effective_from, DATE '0001-01-01') DESC,
    COALESCE(item_effective_from, DATE '0001-01-01') DESC,
    price_list_id DESC
)
SELECT
  sku_id, sku_code, sku_name,
  price_list_id, price_list_code, price_list_name, price_list_type,
  item_id, mrp, tp, dp, vat_rate,
  scope_id, scope_distributor_id, scope_org_node_id, scope_outlet_type
FROM best
ORDER BY sku_code ASC
LIMIT $7 OFFSET $8
`;

    const rows = await this.ds.query(sql, [
      ctx.date,           // $1
      ctx.distributor_id, // $2
      ctx.org_node_id,    // $3
      ctx.outlet_type,    // $4
      auth.company_id,    // $5
      q,                  // $6
      limit,              // $7
      offset,             // $8
    ]);

    const countSql = `
WITH candidates AS (
  SELECT sku.id AS sku_id,
    (CASE WHEN s.distributor_id IS NOT NULL AND s.distributor_id::text = COALESCE($2,'') THEN 100 ELSE 0 END) +
    (CASE WHEN s.org_node_id IS NOT NULL AND s.org_node_id::text = COALESCE($3,'') THEN 50 ELSE 0 END) +
    (CASE WHEN s.outlet_type IS NOT NULL AND s.outlet_type = $4 THEN 10 ELSE 0 END) AS score,
    s.effective_from AS scope_effective_from,
    i.effective_from AS item_effective_from,
    pl.id AS price_list_id
  FROM md_sku sku
  JOIN md_price_list_item i
    ON i.company_id = sku.company_id
   AND i.sku_id = sku.id
   AND i.deleted_at IS NULL
   AND i.status = 1
   AND (i.effective_from IS NULL OR i.effective_from <= $1::date)
   AND (i.effective_to IS NULL OR i.effective_to >= $1::date)
  JOIN md_price_list pl
    ON pl.company_id = sku.company_id
   AND pl.id = i.price_list_id
   AND pl.deleted_at IS NULL
   AND pl.status = 1
   AND (pl.effective_from IS NULL OR pl.effective_from <= $1::date)
   AND (pl.effective_to IS NULL OR pl.effective_to >= $1::date)
  LEFT JOIN md_price_list_scope s
    ON s.company_id = pl.company_id
   AND s.price_list_id = pl.id
   AND s.deleted_at IS NULL
   AND s.status = 1
   AND (s.effective_from IS NULL OR s.effective_from <= $1::date)
   AND (s.effective_to IS NULL OR s.effective_to >= $1::date)
  WHERE sku.company_id = $5
    AND sku.deleted_at IS NULL
    AND sku.status = 1
    AND ($6 = '' OR sku.code ILIKE '%'||$6||'%' OR sku.name ILIKE '%'||$6||'%')
    AND (
      pl.price_list_type = 1
      OR (
        s.id IS NOT NULL
        AND (s.distributor_id IS NULL OR s.distributor_id::text = COALESCE($2,''))
        AND (s.org_node_id IS NULL OR s.org_node_id::text = COALESCE($3,''))
        AND (s.outlet_type IS NULL OR s.outlet_type = $4)
      )
    )
),
best AS (
  SELECT DISTINCT ON (sku_id) sku_id
  FROM candidates
  ORDER BY sku_id, score DESC,
    COALESCE(scope_effective_from, DATE '0001-01-01') DESC,
    COALESCE(item_effective_from, DATE '0001-01-01') DESC,
    price_list_id DESC
)
SELECT COUNT(*)::int AS total FROM best
`;

    const totalRes = await this.ds.query(countSql, [
      ctx.date,
      ctx.distributor_id,
      ctx.org_node_id,
      ctx.outlet_type,
      auth.company_id,
      q,
    ]);
    const total = totalRes?.[0]?.total ?? 0;

    return { page, limit, total, context_used: ctx, rows };
  }

  // ============================================================
  // ✅ VISIBLE SCHEMES
  // ============================================================
  async listVisibleSchemes(auth: AuthUser, dto: any) {
    const ctx = await this.resolveContext(auth, dto);

    const page = Number(dto?.page ?? 1);
    const limit = Math.min(200, Math.max(1, Number(dto?.limit ?? 50)));
    const offset = (page - 1) * limit;
    const q = dto?.q ? String(dto.q).trim() : '';

    const sql = `
SELECT
  s.id, s.code, s.name,
  s.scheme_type, s.priority, s.can_stack,
  s.distributor_id, s.org_node_id, s.outlet_type,
  s.effective_from, s.effective_to, s.status
FROM md_scheme s
WHERE s.company_id = $1
  AND s.deleted_at IS NULL
  AND s.status = 1
  AND (s.effective_from IS NULL OR s.effective_from <= $2::date)
  AND (s.effective_to IS NULL OR s.effective_to >= $2::date)
  AND (s.distributor_id IS NULL OR s.distributor_id::text = COALESCE($3,''))
  AND (s.org_node_id IS NULL OR s.org_node_id::text = COALESCE($4,''))
  AND (s.outlet_type IS NULL OR s.outlet_type = $5)
  AND ($6 = '' OR s.code ILIKE '%'||$6||'%' OR s.name ILIKE '%'||$6||'%')
ORDER BY s.priority DESC, s.id DESC
LIMIT $7 OFFSET $8
`;

    const rows = await this.ds.query(sql, [
      auth.company_id,
      ctx.date,
      ctx.distributor_id,
      ctx.org_node_id,
      ctx.outlet_type,
      q,
      limit,
      offset,
    ]);

    const totalRes = await this.ds.query(
      `
SELECT COUNT(*)::int AS total
FROM md_scheme s
WHERE s.company_id = $1
  AND s.deleted_at IS NULL
  AND s.status = 1
  AND (s.effective_from IS NULL OR s.effective_from <= $2::date)
  AND (s.effective_to IS NULL OR s.effective_to >= $2::date)
  AND (s.distributor_id IS NULL OR s.distributor_id::text = COALESCE($3,''))
  AND (s.org_node_id IS NULL OR s.org_node_id::text = COALESCE($4,''))
  AND (s.outlet_type IS NULL OR s.outlet_type = $5)
  AND ($6 = '' OR s.code ILIKE '%'||$6||'%' OR s.name ILIKE '%'||$6||'%')
`,
      [auth.company_id, ctx.date, ctx.distributor_id, ctx.org_node_id, ctx.outlet_type, q],
    );

    const total = totalRes?.[0]?.total ?? 0;
    return { page, limit, total, context_used: ctx, rows };
  }

  // ============================================================
  // ✅ IMPORTANT BUG FIX (your current code)
  // resolveBestPriceBulk() was pushing res.data but resolveBestPrice returns object directly.
  // ============================================================
  async resolveBestPriceBulk(
    auth: AuthUser,
    dto: {
      date: string;
      context: { distributor_id?: string; outlet_type?: number; org_node_id?: string };
      skus: Array<{ sku_id?: string; sku_code?: string }>;
    },
  ) {
    const out: any[] = [];
    for (const s of dto.skus) {
      const res = await this.resolveBestPrice(auth, {
        date: dto.date,
        distributor_id: dto.context?.distributor_id,
        outlet_type: dto.context?.outlet_type,
        org_node_id: dto.context?.org_node_id,
        sku_id: s.sku_id,
        sku_code: s.sku_code,
      } as any);

      // ✅ FIX:
      out.push(res);
    }
    return out;
  }

  async listVisibleSchemeRules(auth: AuthUser, dto: any) {
  const ctx = this.resolveContextFromQuery(dto);

  const page = Number(dto?.page ?? 1);
  const limit = Math.min(200, Math.max(1, Number(dto?.limit ?? 50)));
  const offset = (page - 1) * limit;
  const q = dto?.q ? String(dto.q).trim() : '';

  const sql = `
SELECT
  r.id,
  r.scheme_id,
  s.code AS scheme_code,

  r.buy_sku_id,
  bsku.code AS buy_sku_code,
  bsku.name AS buy_sku_name,

  r.min_qty,
  r.min_amount,

  r.free_sku_id,
  fsku.code AS free_sku_code,
  fsku.name AS free_sku_name,

  r.free_qty,
  r.discount_percent,
  r.discount_amount,

  r.sort_order
FROM md_scheme_rule r
JOIN md_scheme s
  ON s.company_id = r.company_id
 AND s.id = r.scheme_id
 AND s.deleted_at IS NULL
 AND s.status = 1
 AND (s.effective_from IS NULL OR s.effective_from <= $2::date)
 AND (s.effective_to IS NULL OR s.effective_to >= $2::date)
 AND (s.distributor_id IS NULL OR s.distributor_id::text = COALESCE($3,''))
 AND (s.org_node_id IS NULL OR s.org_node_id::text = COALESCE($4,''))
 AND (s.outlet_type IS NULL OR s.outlet_type = $5)

LEFT JOIN md_sku bsku
  ON bsku.company_id = r.company_id
 AND bsku.id = r.buy_sku_id
 AND bsku.deleted_at IS NULL

LEFT JOIN md_sku fsku
  ON fsku.company_id = r.company_id
 AND fsku.id = r.free_sku_id
 AND fsku.deleted_at IS NULL

WHERE r.company_id = $1
  AND r.deleted_at IS NULL
  AND (
    $6 = ''
    OR s.code ILIKE '%'||$6||'%'
    OR bsku.code ILIKE '%'||$6||'%'
    OR bsku.name ILIKE '%'||$6||'%'
    OR fsku.code ILIKE '%'||$6||'%'
    OR fsku.name ILIKE '%'||$6||'%'
  )
ORDER BY s.priority DESC, s.id DESC, r.sort_order ASC, r.id ASC
LIMIT $7 OFFSET $8
`;

  const rows = await this.ds.query(sql, [
    auth.company_id,
    ctx.date,
    ctx.distributor_id,
    ctx.org_node_id,
    ctx.outlet_type,
    q,
    limit,
    offset,
  ]);

  const countSql = `
SELECT COUNT(*)::int AS total
FROM md_scheme_rule r
JOIN md_scheme s
  ON s.company_id = r.company_id
 AND s.id = r.scheme_id
 AND s.deleted_at IS NULL
 AND s.status = 1
 AND (s.effective_from IS NULL OR s.effective_from <= $2::date)
 AND (s.effective_to IS NULL OR s.effective_to >= $2::date)
 AND (s.distributor_id IS NULL OR s.distributor_id::text = COALESCE($3,''))
 AND (s.org_node_id IS NULL OR s.org_node_id::text = COALESCE($4,''))
 AND (s.outlet_type IS NULL OR s.outlet_type = $5)
LEFT JOIN md_sku bsku
  ON bsku.company_id = r.company_id
 AND bsku.id = r.buy_sku_id
 AND bsku.deleted_at IS NULL
LEFT JOIN md_sku fsku
  ON fsku.company_id = r.company_id
 AND fsku.id = r.free_sku_id
 AND fsku.deleted_at IS NULL
WHERE r.company_id = $1
  AND r.deleted_at IS NULL
  AND (
    $6 = ''
    OR s.code ILIKE '%'||$6||'%'
    OR bsku.code ILIKE '%'||$6||'%'
    OR bsku.name ILIKE '%'||$6||'%'
    OR fsku.code ILIKE '%'||$6||'%'
    OR fsku.name ILIKE '%'||$6||'%'
  )
`;

  const totalRes = await this.ds.query(countSql, [
    auth.company_id,
    ctx.date,
    ctx.distributor_id,
    ctx.org_node_id,
    ctx.outlet_type,
    q,
  ]);
  const total = totalRes?.[0]?.total ?? 0;

  return { page, limit, total, context_used: ctx, rows };
}

}