// src/modules/inventory/inventory-common.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import {
  InvLotSourceDocType,
  ScopeType,
  UserType,
  WarehouseOwnerType,
} from '../../common/constants/enums';

import { InvStockBalance } from './entities/inv_stock_balance.entity';
import { InvLot } from './entities/inv_lot.entity';
import { MdWarehouse } from '../master/entities/md_warehouse.entity';
import { InvTransfer } from './entities/inv_transfer.entity';

export type AuthScope = {
  scope_type: ScopeType;
  org_node_id?: string | null;
  distributor_id?: string | null;
  sub_distributor_id?: string | null; // ✅ add this
};


export type AuthUser = {
  company_id: string;
  user_id?: string;
  sub?: string;
  id?: string;

  user_type: UserType;

  distributor_id?: string | null;
  sub_distributor_id?: string | null;

  scopes?: AuthScope[];
  roles?: Array<{ id?: string; code?: string; name?: string }>;
};

// ------------------------------------
// Numeric/date helpers
// ------------------------------------
export function asDec(x: any) {
  if (x === null || x === undefined) return null;
  return String(x);
}
export function ensurePositiveDec(label: string, value: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new BadRequestException(`${label} must be > 0`);
}
export function ensureNonNegativeDec(label: string, value: any) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new BadRequestException(`${label} must be >= 0`);
}
export function parseDateOrThrow(label: string, v: any): Date {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${label}`);
  return d;
}

@Injectable()
export class InventoryCommonService {
  constructor(
    @InjectDataSource() public readonly dataSource: DataSource,

    @InjectRepository(MdWarehouse) private readonly whRepo: Repository<MdWarehouse>,
    @InjectRepository(InvLot) private readonly lotRepo: Repository<InvLot>,
    @InjectRepository(InvStockBalance) private readonly balRepo: Repository<InvStockBalance>,
  ) {}

  normalizePage(q: { page?: number; limit?: number }) {
    const page = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 20;
    const skip = (safePage - 1) * safeLimit;
    return { page: safePage, limit: safeLimit, skip };
  }

  actorId(auth: any) {
    return String(auth.user_id ?? auth.id ?? auth.sub ?? '');
  }

  private hasRole(auth: AuthUser, code: string) {
    return (auth.roles ?? []).some((r) => String(r.code ?? '') === code);
  }

  hasGlobalScope(auth: AuthUser) {
    // ✅ Only internal staff can ever use GLOBAL
    if (Number(auth.user_type) !== UserType.EMPLOYEE) return false;

    if (this.hasRole(auth, 'SUPER_ADMIN')) return true;

    return (auth.scopes ?? []).some((s) => Number(s.scope_type) === ScopeType.GLOBAL);
  }

  isDistUser(auth: AuthUser) {
    return auth.user_type === UserType.DISTRIBUTOR_USER;
  }
  isSubDistUser(auth: AuthUser) {
    return auth.user_type === UserType.SUB_DISTRIBUTOR_USER;
  }

  // =========================================================
  // Warehouse access control (Option A)
  // =========================================================
async assertWarehouseAccessible(auth: AuthUser, warehouseId: string) {
  const company_id = auth.company_id;

  const wh = await this.whRepo.findOne({
    where: { id: warehouseId, company_id, deleted_at: null } as any,
  });
  if (!wh) throw new BadRequestException('Invalid warehouse_id');

  const ot = Number((wh as any).owner_type) as WarehouseOwnerType;
  console.log(warehouseId);
  const oid = (wh as any).owner_id != null ? String((wh as any).owner_id) : null;

  // =========================================================
  // 1) INTERNAL USERS (EMPLOYEE) => allow within same company
  //    (This solves your transfer issue: no need distributor scope)
  // =========================================================
  if (Number(auth.user_type) === UserType.EMPLOYEE) {
    return wh;
  }

  // =========================================================
  // 2) GLOBAL SCOPE => allow (if you still use it for staff types)
  // =========================================================
  if (this.hasGlobalScope(auth)) {
    return wh;
  }

  // =========================================================
  // 3) Warehouse-owner specific rules for external users
  // =========================================================

  // -------------------------
  // COMPANY warehouse
  // -------------------------
  if (ot === WarehouseOwnerType.COMPANY) {
    // distributor/sub-distributor/outlet users cannot access center
    throw new ForbiddenException('You cannot access center warehouse');
  }

  // -------------------------
  // DISTRIBUTOR warehouse
  // -------------------------
  if (ot === WarehouseOwnerType.DISTRIBUTOR) {
    // distributor user: must match distributor_id
    if (Number(auth.user_type) === UserType.DISTRIBUTOR_USER) {
      const myDistId = this.getDistId(auth);
      if (!myDistId) throw new ForbiddenException('Distributor user missing distributor_id');
      if (!oid || oid !== myDistId) throw new ForbiddenException('No access to this warehouse');
      return wh;
    }

    // sub distributor user cannot access distributor warehouse
    if (Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER) {
      throw new ForbiddenException('Sub-distributor user cannot access distributor warehouse');
    }

    // outlet user cannot access distributor warehouse (usually)
    if (Number(auth.user_type) === UserType.OUTLET_USER) {
      throw new ForbiddenException('Outlet user cannot access distributor warehouse');
    }

    // any other user types => block by default
    throw new ForbiddenException('No access to this warehouse');
  }

  // -------------------------
  // SUB_DISTRIBUTOR warehouse
  // -------------------------
  if (ot === WarehouseOwnerType.SUB_DISTRIBUTOR) {
    if (Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER) {
      const mySubId = this.getDistId(auth);
      if (!mySubId) throw new ForbiddenException('Sub-distributor user missing sub_distributor_id');

      if (!oid || oid !== mySubId) throw new ForbiddenException('No access to this warehouse');
      return wh;
    }

    // no one else can access sub-distributor warehouse
    throw new ForbiddenException('No access to sub-distributor warehouse');
  }

  throw new ForbiddenException('Unknown warehouse owner type');
}
public getDistId(auth: AuthUser): string {
  // 1) direct field (if JWT provides it)
  const direct = auth.distributor_id != null ? String(auth.distributor_id).trim() : '';
  if (direct) return direct;

  // 2) scopes fallback (your current payload)
  const scoped = (auth.scopes ?? [])
    .map((s) => (s?.distributor_id != null ? String(s.distributor_id).trim() : ''))
    .find((x) => x);

  return scoped ?? '';
}

async assertTransferReadable(auth: AuthUser, tr: InvTransfer) {
  const fromWid = String((tr as any).from_warehouse_id);
  const toWid = String((tr as any).to_warehouse_id);

  // internal users can access both
  if (Number(auth.user_type) === UserType.EMPLOYEE || this.hasGlobalScope(auth)) {
    await this.assertWarehouseAccessible(auth, fromWid);
    await this.assertWarehouseAccessible(auth, toWid);
    return;
  }

  // external users: allow only if they can access destination
  await this.assertWarehouseAccessible(auth, toWid);
}
public getSubDistId(auth: AuthUser): string {
  return this.getSubDistributorIdFromAuth(auth);
}

async listMyWarehouseIds(auth: AuthUser) {
  const company_id = auth.company_id;

  if (auth.user_type === UserType.DISTRIBUTOR_USER) {
    const distId = this.getDistributorIdFromAuth(auth);
    if (!distId) throw new ForbiddenException('Distributor user missing distributor_id');

    const rows = await this.whRepo
      .createQueryBuilder('w')
      .where('w.company_id=:cid', { cid: company_id })
      .andWhere('w.deleted_at IS NULL')
      .andWhere('w.owner_type=:ot', { ot: WarehouseOwnerType.DISTRIBUTOR })
      .andWhere('w.owner_id=:oid', { oid: distId })
      .select(['w.id AS id'])
      .getRawMany();

    return rows.map((r: any) => String(r.id));
  }

  if (auth.user_type === UserType.SUB_DISTRIBUTOR_USER) {
    const subId = this.getSubDistributorIdFromAuth(auth);
    if (!subId) throw new ForbiddenException('Sub-distributor user missing sub_distributor_id');

    const rows = await this.whRepo
      .createQueryBuilder('w')
      .where('w.company_id=:cid', { cid: company_id })
      .andWhere('w.deleted_at IS NULL')
      .andWhere('w.owner_type=:ot', { ot: WarehouseOwnerType.SUB_DISTRIBUTOR })
      .andWhere('w.owner_id=:oid', { oid: subId })
      .select(['w.id AS id'])
      .getRawMany();

    return rows.map((r: any) => String(r.id));
  }

  return [];
}

private getDistributorIdFromAuth(auth: AuthUser): string {
  const direct = auth.distributor_id != null ? String(auth.distributor_id) : '';
  if (direct) return direct;

  const fromScope =
    (auth.scopes ?? []).find((s) => String(s.distributor_id ?? '').trim())?.distributor_id ?? null;

  return fromScope != null ? String(fromScope) : '';
}
async resolveInventoryWarehouseScope(auth: AuthUser): Promise<{
  isAdmin: boolean;
  allowedWarehouseIds: string[];
}> {
  const userId = this.actorId(auth);
  if (!userId) return { isAdmin: false, allowedWarehouseIds: [] };

  const companyId = String(auth.company_id);

  // ✅ 1) EMPLOYEE + GLOBAL => all warehouses
  // ✅ 1) EMPLOYEE
if (Number(auth.user_type) === UserType.EMPLOYEE) {
  // 1A) EMPLOYEE + GLOBAL => all warehouses
  if (this.hasGlobalScope(auth)) {
    const rows = await this.whRepo
      .createQueryBuilder('w')
      .select(['w.id AS id'])
      .where('w.company_id=:cid', { cid: companyId })
      .andWhere('w.deleted_at IS NULL')
      .getRawMany();

    return { isAdmin: true, allowedWarehouseIds: rows.map((r: any) => String(r.id)) };
  }

  // 1B) EMPLOYEE (admin/system) => allow COMPANY warehouses by default
  // (this makes warehouse "1" visible if it is owner_type=COMPANY)
  const rows = await this.whRepo
    .createQueryBuilder('w')
    .select(['w.id AS id'])
    .where('w.company_id=:cid', { cid: companyId })
    .andWhere('w.deleted_at IS NULL')
    .andWhere('w.owner_type = :ot', { ot: WarehouseOwnerType.COMPANY })
    .getRawMany();

  // Optionally: if you truly want ONLY default warehouse 1:
  // .andWhere('w.id = :wid', { wid: '1' })

  return { isAdmin: true, allowedWarehouseIds: rows.map((r: any) => String(r.id)) };
}


  // ✅ 2) Distributor user => only his distributor warehouses (do not rely on md_user_scope)
  if (Number(auth.user_type) === UserType.DISTRIBUTOR_USER) {
    const distId = this.getDistId(auth);
    if (!distId) return { isAdmin: false, allowedWarehouseIds: [] };

    const rows = await this.whRepo
      .createQueryBuilder('w')
      .select(['w.id AS id'])
      .where('w.company_id=:cid', { cid: companyId })
      .andWhere('w.deleted_at IS NULL')
      .andWhere('w.owner_type=:ot AND w.owner_id=:oid', {
        ot: WarehouseOwnerType.DISTRIBUTOR,
        oid: distId,
      })
      .getRawMany();

    return { isAdmin: false, allowedWarehouseIds: rows.map((r: any) => String(r.id)) };
  }

  // ✅ 3) Sub-distributor user => only his sub-distributor warehouses
  if (Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER) {
    const subId = this.getSubDistId(auth); // your public wrapper
    if (!subId) return { isAdmin: false, allowedWarehouseIds: [] };

    const rows = await this.whRepo
      .createQueryBuilder('w')
      .select(['w.id AS id'])
      .where('w.company_id=:cid', { cid: companyId })
      .andWhere('w.deleted_at IS NULL')
      .andWhere('w.owner_type=:ot AND w.owner_id=:oid', {
        ot: WarehouseOwnerType.SUB_DISTRIBUTOR,
        oid: subId,
      })
      .getRawMany();

    return { isAdmin: false, allowedWarehouseIds: rows.map((r: any) => String(r.id)) };
  }

  // ✅ 4) ORG USERS (Rep/FLM/SLM/RSM etc)
  // Must have DISTRIBUTOR scopes in md_user_scope, otherwise NO inventory access.
  const scopes = await this.dataSource.query(
    `select scope_type, distributor_id
     from md_user_scope
     where company_id=$1 and user_id=$2`,
    [companyId, userId],
  );

  const distributorIds = Array.from(
    new Set(
      (scopes ?? [])
        .filter((s: any) => Number(s.scope_type) === ScopeType.DISTRIBUTOR && s.distributor_id)
        .map((s: any) => String(s.distributor_id)),
    ),
  );

  if (!distributorIds.length) {
    // ✅ critical: do not fallback to company warehouse
    return { isAdmin: false, allowedWarehouseIds: [] };
  }

  const whRows = await this.whRepo
    .createQueryBuilder('w')
    .select(['w.id AS id'])
    .where('w.company_id=:cid', { cid: companyId })
    .andWhere('w.deleted_at IS NULL')
    .andWhere('w.owner_type=:ot', { ot: WarehouseOwnerType.DISTRIBUTOR })
    .andWhere('w.owner_id IN (:...dids)', { dids: distributorIds })
    .getRawMany();

  return { isAdmin: false, allowedWarehouseIds: whRows.map((r: any) => String(r.id)) };
}

async resolveInventoryWarehouseScopeForAlerts(auth: AuthUser): Promise<{
  isAdmin: boolean;
  allowedWarehouseIds: string[];
}> {
  const userId = this.actorId(auth);
  if (!userId) return { isAdmin: false, allowedWarehouseIds: [] };

  const companyId = String(auth.company_id);

  // ✅ Treat "not distributor/sub-distributor user" as employee/admin/system
  // (so admin/system users always see alerts across all warehouses)
  const ut = Number(auth.user_type);

  const isDistUser = ut === UserType.DISTRIBUTOR_USER;
  const isSubDistUser = ut === UserType.SUB_DISTRIBUTOR_USER;

  if (!isDistUser && !isSubDistUser) {
    const rows = await this.whRepo
      .createQueryBuilder('w')
      .select(['w.id AS id'])
      .where('w.company_id=:cid', { cid: companyId })
      .andWhere('w.deleted_at IS NULL')
      .getRawMany();

    return { isAdmin: true, allowedWarehouseIds: rows.map((r: any) => String(r.id)) };
  }

  // ✅ distributor/sub-distributor and org users keep existing rules
  return this.resolveInventoryWarehouseScope(auth);
}

private getSubDistributorIdFromAuth(auth: AuthUser): string {
  const direct = auth.sub_distributor_id != null ? String(auth.sub_distributor_id) : '';
  if (direct) return direct;

  // if you store sub_distributor_id in scopes, add it in AuthScope type and read here
  const fromScope = (auth.scopes ?? []).find((s: any) => String(s.sub_distributor_id ?? '').trim())
    ?.sub_distributor_id;

  return fromScope != null ? String(fromScope) : '';
}

  // ------------------------------------
  // Stock balance delta (atomic) + negative guard
  // ------------------------------------
  async applyBalanceDelta(
    manager: any,
    args: {
      company_id: string;
      warehouse_id: string;
      sku_id: string;
      delta_on_hand: string;
      delta_reserved?: string;
    },
  ) {
    const dOn = Number(args.delta_on_hand || 0);
    const dRes = Number(args.delta_reserved || 0);

    if (!Number.isFinite(dOn) || !Number.isFinite(dRes)) {
      throw new BadRequestException('Invalid stock delta');
    }

    await manager.query(
      `
      INSERT INTO inv_stock_balance (company_id, warehouse_id, sku_id, qty_on_hand, qty_reserved, updated_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (company_id, warehouse_id, sku_id)
      DO UPDATE SET
        qty_on_hand = inv_stock_balance.qty_on_hand + EXCLUDED.qty_on_hand,
        qty_reserved = inv_stock_balance.qty_reserved + EXCLUDED.qty_reserved,
        updated_at = now()
      `,
      [args.company_id, args.warehouse_id, args.sku_id, String(dOn), String(dRes)],
    );

    const row = await manager.query(
      `
      SELECT qty_on_hand::numeric AS qty_on_hand, qty_reserved::numeric AS qty_reserved
      FROM inv_stock_balance
      WHERE company_id=$1 AND warehouse_id=$2 AND sku_id=$3
      `,
      [args.company_id, args.warehouse_id, args.sku_id],
    );

    const on = Number(row?.[0]?.qty_on_hand ?? 0);
    const res = Number(row?.[0]?.qty_reserved ?? 0);

    if (on < -0.0000001) throw new ConflictException('Insufficient stock (qty_on_hand would become negative)');
    if (res < -0.0000001) throw new ConflictException('Invalid stock (qty_reserved would become negative)');
  }

  // ------------------------------------
  // FIFO lot allocation
  // ------------------------------------
  async allocateLotsFIFO(
    manager: any,
    args: { company_id: string; warehouse_id: string; sku_id: string; qty_out: string },
  ): Promise<Array<{ lot_id: string; qty: string }>> {
    ensurePositiveDec('qty_out', args.qty_out);

    let remaining = Number(args.qty_out);

    const lots = await manager
      .getRepository(InvLot)
      .createQueryBuilder('l')
      .where('l.company_id=:cid', { cid: args.company_id })
      .andWhere('l.warehouse_id=:wid', { wid: args.warehouse_id })
      .andWhere('l.sku_id=:sid', { sid: args.sku_id })
      .andWhere('l.qty_available > 0')
      .orderBy('l.expiry_date', 'ASC', 'NULLS LAST')
      .addOrderBy('l.received_at', 'ASC')
      .addOrderBy('l.id', 'ASC')
      .select(['l.id AS id', 'l.qty_available AS qty_available'])
      .getRawMany();

    const alloc: Array<{ lot_id: string; qty: string }> = [];

    for (const r of lots) {
      if (remaining <= 0) break;
      const avail = Number(r.qty_available);
      if (!Number.isFinite(avail) || avail <= 0) continue;

      const take = Math.min(avail, remaining);
      alloc.push({ lot_id: String(r.id), qty: String(take) });
      remaining -= take;
    }

    if (remaining > 0.0000001) throw new ConflictException('Insufficient lot stock (qty_available)');

    for (const a of alloc) {
      await manager.query(
        `
        UPDATE inv_lot
        SET qty_available = qty_available - $1,
            updated_at = now()
        WHERE company_id=$2 AND id=$3
        `,
        [a.qty, args.company_id, a.lot_id],
      );
    }

    return alloc;
  }


}
