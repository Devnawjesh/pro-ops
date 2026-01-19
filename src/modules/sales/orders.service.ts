import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Brackets } from 'typeorm';

import { SoOrder } from './entities/so_order.entity';
import { SoOrderItem } from './entities/so_order_item.entity';
import { SoAllocation } from './entities/so_allocation.entity';
import { SoAllocationItem } from './entities/so_allocation_item.entity';
import { SoAllocationLot } from './entities/so_allocation_lot.entity';

import { PricingService } from '../pricing/pricing.service';
import { InventoryCommonService } from '../inventory/inventory-common.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrderDto } from './dto/list-order.dto';
import { RejectOrderDto } from './dto/reject-order.dto';

import { SoOrderStatus } from './constants/order.enums';
import { ScopeType, Status, UserType, WarehouseOwnerType } from '../../common/constants/enums';

type AuthUser = {
  company_id: string;
  user_id?: string;
  id?: string;
  sub?: string;
  user_type?: number;
};
type PricedLine = {
  sku_id: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
  price_list_id: string;
  price_list_item_id: string;
};

type PricedLineUpdate = {
  sku_id: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
  price_list_id?: string;
  price_list_item_id?: string;
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(SoOrder) private readonly orderRepo: Repository<SoOrder>,
    @InjectRepository(SoOrderItem) private readonly itemRepo: Repository<SoOrderItem>,
    @InjectRepository(SoAllocation) private readonly allocRepo: Repository<SoAllocation>,
    @InjectRepository(SoAllocationItem) private readonly allocItemRepo: Repository<SoAllocationItem>,
    @InjectRepository(SoAllocationLot) private readonly allocLotRepo: Repository<SoAllocationLot>,

    private readonly pricing: PricingService,
    private readonly inv: InventoryCommonService,
  ) {}

  // ---------------- helpers ----------------

  private actorId(auth: any) {
    const v = auth.user_id ?? auth.id ?? auth.sub;
    return v ? String(v) : null;
 }

  private assertISODate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('date must be YYYY-MM-DD');
  }

  private async getMyTerritoryOrgNode(auth: AuthUser): Promise<string | null> {
    const uid = this.actorId(auth);
    if (!uid) throw new ForbiddenException('Unauthenticated');

    // Territory scope: scope_type=HIERARCHY and org_node_id present (your md_user_scope)
    // We take the most recent one if multiple.
    const rows = await this.ds.query(
      `
      select org_node_id
      from md_user_scope
      where company_id=$1 and user_id=$2 and scope_type=$3 and org_node_id is not null
      order by id desc
      limit 1
      `,
      [auth.company_id, uid, ScopeType.HIERARCHY],
    );

    return rows?.[0]?.org_node_id != null ? String(rows[0].org_node_id) : null;
  }

  private async assertOutletAccessibleByTerritory(auth: AuthUser, outlet_id: string, territory_org_node_id: string) {
    // uses md_outlet_org like your outlet service pattern (active + effective)
    // If you use different table, adjust here.
    const today = new Date().toISOString().slice(0, 10);

    const rows = await this.ds.query(
      `
      select 1
      from md_outlet o
      join md_outlet_org oog
        on oog.company_id=o.company_id
       and oog.outlet_id=o.id
       and oog.deleted_at is null
       and oog.status=1
       and (oog.effective_from is null or oog.effective_from <= $3::date)
       and (oog.effective_to is null or oog.effective_to >= $3::date)
      where o.company_id=$1
        and o.id=$2
        and o.deleted_at is null
        and o.status=1
        and oog.org_node_id::text = $4
      limit 1
      `,
      [auth.company_id, String(outlet_id), today, String(territory_org_node_id)],
    );

    if (!rows?.length) throw new ForbiddenException('Outlet not in your territory scope');
  }

  private async loadOutletMeta(auth: AuthUser, outlet_id: string): Promise<{ outlet_type: number | null; org_node_id: string | null }> {
    const today = new Date().toISOString().slice(0, 10);

    const rows = await this.ds.query(
      `
      select
        o.outlet_type as outlet_type,
        oog.org_node_id as org_node_id
      from md_outlet o
      left join md_outlet_org oog
        on oog.company_id=o.company_id
       and oog.outlet_id=o.id
       and oog.deleted_at is null
       and oog.status=1
       and (oog.effective_from is null or oog.effective_from <= $3::date)
       and (oog.effective_to is null or oog.effective_to >= $3::date)
      where o.company_id=$1 and o.id=$2 and o.deleted_at is null
      limit 1
      `,
      [auth.company_id, String(outlet_id), today],
    );

    if (!rows?.length) throw new BadRequestException('Invalid outlet_id');
    return {
      outlet_type: rows[0].outlet_type != null ? Number(rows[0].outlet_type) : null,
      org_node_id: rows[0].org_node_id != null ? String(rows[0].org_node_id) : null,
    };
  }

  private async genOrderNo(company_id: string): Promise<string> {
    // Simple: SO-YYYYMMDD-###### using a DB sequence-like approach
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rows = await this.ds.query(`select nextval('so_order_no_seq') as n`);
    const n = String(rows?.[0]?.n ?? '1').padStart(6, '0');
    return `SO-${ymd}-${n}`;
  }

  // Create the sequence once:
  // CREATE SEQUENCE IF NOT EXISTS so_order_no_seq;

  // ---------------- core pricing calc ----------------

  private computeLineAmounts(args: {
    qty: number;
    unit_price: number;
    line_discount: number;
    vat_rate: number;
  }) {
    const gross = args.qty * args.unit_price;
    const disc = Math.max(0, args.line_discount);
    const taxable = Math.max(0, gross - disc);
    const vat = (taxable * (args.vat_rate || 0)) / 100;
    const net = taxable + vat;
    return { gross, disc, taxable, vat, net };
  }

  // =========================================================
  // CREATE DRAFT
  // =========================================================
async createDraft(auth: AuthUser, dto: CreateOrderDto) {
  this.assertISODate(dto.order_date);

  const uid = this.actorId(auth);
  if (!uid) throw new ForbiddenException('Unauthenticated');
  if (!dto.lines?.length) throw new BadRequestException('lines required');

  // ✅ robust submit flag parsing (snake_case + camelCase)
  const rawSubmit =
    (dto as any).submit_now ??
    (dto as any).submitNow ??
    (dto as any).submit ??
    false;

  const submitNow = (() => {
    if (rawSubmit === true) return true;
    if (rawSubmit === false || rawSubmit == null) return false;
    const v = String(rawSubmit).trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
  })();

  // territory restriction (if any)
  const myTerritory = await this.getMyTerritoryOrgNode(auth);
  if (myTerritory) {
    await this.assertOutletAccessibleByTerritory(auth, dto.outlet_id, myTerritory);
  }

  const outletMeta = await this.loadOutletMeta(auth, dto.outlet_id);

  // stock check
  await this.assertLinesStockReadableAndAvailable(auth, dto.lines);

  // price resolve
  const pricedLines: PricedLine[] = [];
  for (const l of dto.lines) {
    const sku_id = String(l.sku_id);
    const qtyNum = Number(l.qty);
    if (!(qtyNum > 0)) throw new BadRequestException(`qty must be > 0 for sku_id=${sku_id}`);

    const best = await this.pricing.resolveBestPrice(auth as any, {
      date: dto.order_date,
      distributor_id: dto.distributor_id,
      org_node_id: outletMeta.org_node_id,
      outlet_type: outletMeta.outlet_type,
      sku_id,
    } as any);

    if (!best?.found) throw new BadRequestException(`No price found for sku_id=${sku_id}`);

    const unit_price = Number(best.item.tp ?? 0);
    const vat_rate = Number(best.item.vat_rate ?? 0);
    if (!(unit_price > 0)) throw new BadRequestException(`Invalid TP price for sku_id=${sku_id}`);

    pricedLines.push({
      sku_id,
      qty: qtyNum,
      unit_price,
      vat_rate,
      price_list_id: String(best.price_list.id),
      price_list_item_id: String(best.item.id),
    });
  }

  // apply schemes
  const schemeRes = await this.pricing.applySchemesToOrder(auth as any, {
    date: dto.order_date,
    distributor_id: dto.distributor_id,
    org_node_id: outletMeta.org_node_id,
    outlet_type: outletMeta.outlet_type,
    lines: pricedLines.map((x) => ({
      sku_id: x.sku_id,
      qty: String(x.qty),
      unit_price: String(x.unit_price),
    })),
  } as any);

  const discBySku = new Map<string, number>();
  for (const r of schemeRes.lines ?? []) discBySku.set(String(r.sku_id), Number(r.discount_amount ?? 0));

  // TX
  return await this.ds.transaction(async (manager) => {
    const order_no = await this.genOrderNo(auth.company_id);
    const statusToSave = submitNow ? SoOrderStatus.SUBMITTED : SoOrderStatus.DRAFT;

    const orderRepo = manager.getRepository(SoOrder);
    const itemRepo = manager.getRepository(SoOrderItem);

    // create header
    const orderEntity = orderRepo.create({
      company_id: auth.company_id,
      order_no,
      order_date: dto.order_date,
      status: statusToSave,

      outlet_id: dto.outlet_id,
      distributor_id: dto.distributor_id,
      org_node_id: outletMeta.org_node_id,
      outlet_type: outletMeta.outlet_type,

      created_by_user_id: uid,
      remarks: dto.remarks ?? null,

      submitted_at: submitNow ? new Date() : null,
      submitted_by_user_id: submitNow ? uid : null,

      gross_amount: '0',
      discount_amount: '0',
      net_amount: '0',
    } as any);

    // save header (handle TS weirdness: can be SoOrder or SoOrder[])
    const savedAny = (await orderRepo.save(orderEntity as any)) as any;

    const orderId = String(Array.isArray(savedAny) ? savedAny?.[0]?.id : savedAny?.id);
    if (!orderId) throw new ConflictException('Failed to create order (no id returned)');

    // build item rows + totals
    let grossTotal = 0;
    let discTotal = 0;
    let netTotal = 0;

    const itemRows: any[] = [];
    let lineNo = 1;

    for (const pl of pricedLines) {
      const lineDisc = discBySku.get(pl.sku_id) ?? 0;

      const calc = this.computeLineAmounts({
        qty: pl.qty,
        unit_price: pl.unit_price,
        line_discount: lineDisc,
        vat_rate: pl.vat_rate,
      });

      grossTotal += calc.gross;
      discTotal += calc.disc;
      netTotal += calc.net;

      itemRows.push({
        company_id: auth.company_id,
        order_id: orderId,
        line_no: lineNo++,
        sku_id: pl.sku_id,
        qty: String(pl.qty),
        unit_price: String(pl.unit_price),
        line_discount: String(calc.disc),
        line_total: String(calc.net),
      });
    }

    await itemRepo.insert(itemRows);

    // update totals (avoid saved.gross_amount typing problems)
    await orderRepo.update(
      { company_id: auth.company_id, id: orderId } as any,
      {
        gross_amount: grossTotal.toFixed(2),
        discount_amount: discTotal.toFixed(2),
        net_amount: netTotal.toFixed(2),
        status: statusToSave as any,
      } as any,
    );

    const order = await orderRepo.findOne({ where: { company_id: auth.company_id, id: orderId } as any });
    const items = await itemRepo.find({ where: { company_id: auth.company_id, order_id: orderId } as any });

    return {
      success: true,
      message: 'OK',
      data: {
        order,
        items,
        applied_schemes: schemeRes.applied_schemes ?? [],
        free_items: schemeRes.free_items ?? [],
      },
    };
  });
}


async listPendingApprovals(auth: AuthUser, q: ListOrderDto) {
  // Force status=SUBMITTED regardless of caller
  return this.list(auth, { ...q, status: String(SoOrderStatus.SUBMITTED) } as any);
}

  // =========================================================
  // UPDATE DRAFT (replace lines)
  // =========================================================
  async updateDraft(auth: AuthUser, id: string, dto: UpdateOrderDto) {
    const uid = this.actorId(auth);
    if (!uid) throw new ForbiddenException('Unauthenticated');

    const o = await this.orderRepo.findOne({ where: { id, company_id: auth.company_id } as any });
    if (!o) throw new NotFoundException('Order not found');
    if (Number(o.status) !== SoOrderStatus.DRAFT) throw new ConflictException('Only DRAFT can be edited');

    // if outlet_id changes, enforce territory rule
    const myTerritory = await this.getMyTerritoryOrgNode(auth);
    const outlet_id = dto.outlet_id ?? o.outlet_id;
    if (myTerritory) await this.assertOutletAccessibleByTerritory(auth, outlet_id, myTerritory);

    const order_date = dto.order_date ?? o.order_date;
    this.assertISODate(order_date);

    const distributor_id = dto.distributor_id ?? o.distributor_id;

    const outletMeta = await this.loadOutletMeta(auth, outlet_id);

    const lines = dto.lines ?? [];
    if (!lines.length) throw new BadRequestException('lines required');

    await this.assertLinesStockReadableAndAvailable(auth, lines);

    // price resolve
    const pricedLines: PricedLineUpdate[] = [];
    for (const l of lines) {
      const best = await this.pricing.resolveBestPrice(auth as any, {
        date: order_date,
        distributor_id,
        org_node_id: outletMeta.org_node_id,
        outlet_type: outletMeta.outlet_type,
        sku_id: l.sku_id,
      } as any);

      if (!best?.found) throw new BadRequestException(`No price found for sku_id=${l.sku_id}`);

      pricedLines.push({
        sku_id: String(l.sku_id),
        qty: Number(l.qty),
        unit_price: Number(best.item.tp ?? 0),
        vat_rate: Number(best.item.vat_rate ?? 0),
      });
    }

    const schemeRes = await this.pricing.applySchemesToOrder(auth as any, {
      date: order_date,
      distributor_id,
      org_node_id: outletMeta.org_node_id,
      outlet_type: outletMeta.outlet_type,
      lines: pricedLines.map((x) => ({ sku_id: x.sku_id, qty: String(x.qty), unit_price: String(x.unit_price) })),
    } as any);

    const discBySku = new Map<string, number>();
    for (const r of schemeRes.lines ?? []) discBySku.set(String(r.sku_id), Number(r.discount_amount ?? 0));

    return await this.ds.transaction(async (manager) => {
      // update header
      o.order_date = order_date;
      o.outlet_id = outlet_id;
      o.distributor_id = distributor_id;
      o.org_node_id = outletMeta.org_node_id;
      o.outlet_type = outletMeta.outlet_type;
      o.remarks = dto.remarks ?? o.remarks;

      await manager.getRepository(SoOrder).save(o);

      // delete old items
      await manager.query(`delete from so_order_item where company_id=$1 and order_id=$2`, [auth.company_id, o.id]);

      let grossTotal = 0;
      let discTotal = 0;
      let netTotal = 0;

      const items: SoOrderItem[] = [];
      let lineNo = 1;

      for (const pl of pricedLines) {
        const lineDisc = discBySku.get(pl.sku_id) ?? 0;

        const calc = this.computeLineAmounts({
          qty: pl.qty,
          unit_price: pl.unit_price,
          line_discount: lineDisc,
          vat_rate: pl.vat_rate,
        });

        grossTotal += calc.gross;
        discTotal += calc.disc;
        netTotal += calc.net;

        items.push(
          manager.create(SoOrderItem, {
            company_id: auth.company_id,
            order_id: o.id,
            line_no: lineNo++,
            sku_id: pl.sku_id,
            qty: String(pl.qty),
            unit_price: String(pl.unit_price),
            line_discount: String(calc.disc),
            line_total: String(calc.net),
          } as any),
        );
      }

      await manager.getRepository(SoOrderItem).save(items);

      o.gross_amount = grossTotal.toFixed(2);
      o.discount_amount = discTotal.toFixed(2);
      o.net_amount = netTotal.toFixed(2);
      await manager.getRepository(SoOrder).save(o);

      return {
        success: true,
        message: 'OK',
        data: { order: o, items, applied_schemes: schemeRes.applied_schemes ?? [], free_items: schemeRes.free_items ?? [] },
      };
    });
  }

  // =========================================================
  // SUBMIT
  // =========================================================
  async submit(auth: AuthUser, id: string) {
    const uid = this.actorId(auth);
    if (!uid) throw new ForbiddenException('Unauthenticated');

    const o = await this.orderRepo.findOne({ where: { id, company_id: auth.company_id } as any });
    if (!o) throw new NotFoundException('Order not found');
    if (Number(o.status) !== SoOrderStatus.DRAFT) throw new ConflictException('Only DRAFT can be submitted');

    const items = await this.itemRepo.find({ where: { company_id: auth.company_id, order_id: id } as any });
    if (!items.length) throw new BadRequestException('Order has no items');

    o.status = SoOrderStatus.SUBMITTED;
    o.submitted_at = new Date();
    o.submitted_by_user_id = uid;

    await this.orderRepo.save(o);

    return { success: true, message: 'OK', data: o };
  }

  // =========================================================
  // APPROVE (reserve stock + create allocations)
  // =========================================================
  async approve(auth: AuthUser, id: string) {
    const uid = this.actorId(auth);
    if (!uid) throw new ForbiddenException('Unauthenticated');

    const o = await this.orderRepo.findOne({ where: { id, company_id: auth.company_id } as any });
    if (!o) throw new NotFoundException('Order not found');
    if (Number(o.status) !== SoOrderStatus.SUBMITTED) throw new ConflictException('Only SUBMITTED can be approved');

    const items = await this.itemRepo.find({ where: { company_id: auth.company_id, order_id: id } as any });
    if (!items.length) throw new BadRequestException('Order has no items');

    // Choose a warehouse for reservation:
    // - distributor warehouse owned by this distributor
    const warehouse_id = await this.pickDistributorWarehouse(auth.company_id, o.distributor_id);
    if (!warehouse_id) throw new ConflictException('No distributor warehouse found for this order');

    return await this.ds.transaction(async (manager) => {
      // prevent double allocation
      const existingAlloc = await manager.getRepository(SoAllocation).findOne({
        where: { company_id: auth.company_id, order_id: o.id } as any,
      });
      if (existingAlloc) throw new ConflictException('Order already allocated');

      // create allocation header
      const alloc = await manager.getRepository(SoAllocation).save(
        manager.create(SoAllocation, {
          company_id: auth.company_id,
          order_id: o.id,
          warehouse_id,
          allocated_at: new Date(),
          allocated_by_user_id: uid,
          status: Status.ACTIVE,
        } as any),
      );

      // reserve per line FIFO lots
      for (const it of items) {
        const qty = String(it.qty);

        const allocItem = await manager.getRepository(SoAllocationItem).save(
          manager.create(SoAllocationItem, {
            company_id: auth.company_id,
            allocation_id: alloc.id,
            order_item_id: it.id,
            sku_id: it.sku_id,
            qty_allocated: qty,
            qty_invoiced: '0',
          } as any),
        );

        // FIFO lots: this will DECREASE inv_lot.qty_available (your method does it)
        const lots = await this.inv.allocateLotsFIFO(manager, {
          company_id: auth.company_id,
          warehouse_id,
          sku_id: it.sku_id,
          qty_out: qty,
        });

        // reserve in stock_balance: qty_reserved += qty
        await this.inv.applyBalanceDelta(manager, {
          company_id: auth.company_id,
          warehouse_id,
          sku_id: it.sku_id,
          delta_on_hand: '0',
          delta_reserved: qty,
        });

        // record allocation lots
        for (const l of lots) {
          await manager.getRepository(SoAllocationLot).save(
            manager.create(SoAllocationLot, {
              company_id: auth.company_id,
              allocation_item_id: allocItem.id,
              lot_id: l.lot_id,
              qty_reserved: String(l.qty),
              qty_consumed: '0',
            } as any),
          );
        }
      }

      // approve header
      o.status = SoOrderStatus.APPROVED;
      o.approved_at = new Date();
      o.approved_by_user_id = uid;
      await manager.getRepository(SoOrder).save(o);

      return { success: true, message: 'OK', data: { order: o, allocation_id: alloc.id, warehouse_id } };
    });
  }

  // =========================================================
  // REJECT
  // =========================================================
  async reject(auth: AuthUser, id: string, dto: RejectOrderDto) {
    const uid = this.actorId(auth);
    if (!uid) throw new ForbiddenException('Unauthenticated');

    const o = await this.orderRepo.findOne({ where: { id, company_id: auth.company_id } as any });
    if (!o) throw new NotFoundException('Order not found');
    if (Number(o.status) !== SoOrderStatus.SUBMITTED) throw new ConflictException('Only SUBMITTED can be rejected');

    o.status = SoOrderStatus.REJECTED;
    o.rejected_at = new Date();
    o.rejected_by_user_id = uid;
    o.reject_reason = String(dto.reason ?? '').trim() || 'Rejected';

    await this.orderRepo.save(o);
    return { success: true, message: 'OK', data: o };
  }

  // =========================================================
  // GET ONE (header + items + allocation info)
  // =========================================================
  async getOne(auth: AuthUser, id: string) {
    const o = await this.orderRepo.findOne({ where: { id, company_id: auth.company_id } as any });
    if (!o) throw new NotFoundException('Order not found');

    // visibility: admin sees all, org users must match scope if they have one
    await this.assertOrderReadableByScope(auth, o);

    const items = await this.itemRepo
      .createQueryBuilder('i')
      .where('i.company_id=:cid', { cid: auth.company_id })
      .andWhere('i.order_id=:oid', { oid: id })
      .leftJoin('md_sku', 's', 's.id=i.sku_id AND s.company_id=i.company_id AND s.deleted_at IS NULL')
      .select([
        'i.id AS id',
        'i.line_no AS line_no',
        'i.sku_id AS sku_id',
        's.code AS sku_code',
        's.name AS sku_name',
        'i.qty AS qty',
        'i.unit_price AS unit_price',
        'i.line_discount AS line_discount',
        'i.line_total AS line_total',
      ])
      .orderBy('i.line_no', 'ASC')
      .getRawMany();

    const alloc = await this.allocRepo.findOne({ where: { company_id: auth.company_id, order_id: id } as any });

    return { success: true, message: 'OK', data: { order: o, items, allocation: alloc ?? null } };
  }

// =========================================================
// LIST (admin + hierarchy scope + filters)
// =========================================================
async list(auth: AuthUser, q: ListOrderDto) {
  const page = Math.max(1, Number(q.page ?? 1));
  const limit = Math.min(200, Math.max(1, Number(q.limit ?? 50)));
  const skip = (page - 1) * limit;

  const qb = this.orderRepo
    .createQueryBuilder('o')
    .where('o.company_id = :cid', { cid: auth.company_id });

  // =========================================================
  // 1) VISIBILITY SCOPE
  // =========================================================

  // -------------------------
  // Distributor users
  // -------------------------
  if (
    Number(auth.user_type) === UserType.DISTRIBUTOR_USER ||
    Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER
  ) {
    const distributorId = await this.getMyDistributorId(auth);

    if (!distributorId) {
      return { success: true, message: 'OK', page, limit, total: 0, pages: 0, rows: [] };
    }

    qb.andWhere('o.distributor_id::text = :did', { did: distributorId });
  }
  // -------------------------
  // Employee users
  // -------------------------
  else if (Number(auth.user_type) === UserType.EMPLOYEE) {
    const allowedTerritoryIds = await this.resolveAllowedTerritoryIds(auth);

    // restricted but no territory resolved
    if (allowedTerritoryIds !== null && allowedTerritoryIds.length === 0) {
      return { success: true, message: 'OK', page, limit, total: 0, pages: 0, rows: [] };
    }

    // apply hierarchy restriction only if exists
    if (allowedTerritoryIds !== null) {
      qb.andWhere('o.org_node_id = ANY(:tids)', {
        tids: allowedTerritoryIds.map((x) => Number(x)),
      });
    }
  }

  // =========================================================
  // 2) FILTERS
  // =========================================================
  if (q.status != null && String(q.status).trim() !== '') {
    qb.andWhere('o.status = :st', { st: Number(q.status) });
  }

  if (q.outlet_id) qb.andWhere('o.outlet_id::text = :oid2', { oid2: String(q.outlet_id) });

  // distributor_id filter allowed ONLY for employee
  if (
    q.distributor_id &&
    Number(auth.user_type) === UserType.EMPLOYEE
  ) {
    qb.andWhere('o.distributor_id::text = :did2', { did2: String(q.distributor_id) });
  }

  if (q.from_date) qb.andWhere('o.order_date >= :fd', { fd: String(q.from_date) });
  if (q.to_date) qb.andWhere('o.order_date <= :td', { td: String(q.to_date) });

  if (q.q?.trim()) {
    const qq = `%${q.q.trim()}%`;
    qb.andWhere(
      new Brackets((b) => {
        b.where('o.order_no ILIKE :qq', { qq }).orWhere('o.remarks ILIKE :qq', { qq });
      }),
    );
  }

  // =========================================================
  // 3) RESULT
  // =========================================================
  const total = await qb.getCount();

  const rows = await qb
    .leftJoin('md_outlet', 'out', 'out.id=o.outlet_id AND out.company_id=o.company_id AND out.deleted_at IS NULL')
    .leftJoin('md_distributor', 'd', 'd.id=o.distributor_id AND d.company_id=o.company_id AND d.deleted_at IS NULL')
    .select([
      'o.id AS id',
      'o.order_no AS order_no',
      'o.order_date AS order_date',
      'o.status AS status',

      'o.outlet_id AS outlet_id',
      'out.name AS outlet_name',

      'o.distributor_id AS distributor_id',
      'd.name AS distributor_name',

      'o.org_node_id AS org_node_id',

      'o.gross_amount AS gross_amount',
      'o.discount_amount AS discount_amount',
      'o.net_amount AS net_amount',

      'o.created_at AS created_at',
      'o.submitted_at AS submitted_at',
      'o.approved_at AS approved_at',
      'o.rejected_at AS rejected_at',
    ])
    .orderBy('o.id', 'DESC')
    .offset(skip)
    .limit(limit)
    .getRawMany();

  return {
    success: true,
    message: 'OK',
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    rows,
  };
}


private async getMyDistributorId(auth: AuthUser): Promise<string | null> {
  const uid = this.actorId(auth);
  if (!uid) throw new ForbiddenException('Unauthenticated');

  const rows = await this.ds.query(
    `
    select distributor_id
    from md_user_scope
    where company_id=$1
      and user_id=$2
      and scope_type=$3
      and distributor_id is not null
    order by id desc
    limit 1
    `,
    [auth.company_id, uid, ScopeType.DISTRIBUTOR],
  );

  return rows?.[0]?.distributor_id ? String(rows[0].distributor_id) : null;
}

  // ---------------- internal helpers ----------------

  private async assertOrderReadableByScope(auth: AuthUser, o: SoOrder) {
  const allowedTerritoryIds = await this.resolveAllowedTerritoryIds(auth);

  if (allowedTerritoryIds === null) return; // admin/global
  if (!allowedTerritoryIds?.length) throw new ForbiddenException('No order scope');

  if (!o.org_node_id || !allowedTerritoryIds.includes(String(o.org_node_id))) {
    throw new ForbiddenException('Order not in your scope');
  }
}


  private async pickDistributorWarehouse(company_id: string, distributor_id: string): Promise<string | null> {
    const rows = await this.ds.query(
      `
      select id
      from md_warehouse
      where company_id=$1
        and deleted_at is null
        and owner_type=$2
        and owner_id::text=$3
      order by id asc
      limit 1
      `,
      [company_id, WarehouseOwnerType.DISTRIBUTOR, String(distributor_id)],
    );
    return rows?.[0]?.id != null ? String(rows[0].id) : null;
  }

  private async assertLinesStockReadableAndAvailable(auth: AuthUser, lines: Array<{ sku_id: string; qty: string }>) {
    // Use your existing inventory scope resolver (allowed warehouses)
    const scope = await this.inv.resolveInventoryWarehouseScope(auth as any);
    const wids = scope.allowedWarehouseIds ?? [];
    if (!wids.length) throw new ForbiddenException('No inventory scope assigned');

    // Check total available across allowed warehouses (simple)
    for (const l of lines) {
      const need = Number(l.qty);
      if (!(need > 0)) throw new BadRequestException('qty must be > 0');

      const rows = await this.ds.query(
        `
        select coalesce(sum(qty_on_hand - qty_reserved),0) as avail
        from inv_stock_balance
        where company_id=$1
          and sku_id=$2
          and warehouse_id = any($3::bigint[])
        `,
        [auth.company_id, String(l.sku_id), wids.map((x) => Number(x))],
      );

      const avail = Number(rows?.[0]?.avail ?? 0);
      if (avail + 1e-9 < need) {
        throw new ConflictException(`Insufficient available stock for sku_id=${l.sku_id} (avail=${avail}, need=${need})`);
      }
    }
  }
  private async resolveAllowedTerritoryIds(auth: AuthUser): Promise<string[] | null> {
  const uid = this.actorId(auth);
  if (!uid) throw new ForbiddenException('Unauthenticated');

  // If you have a concept of "global scope admin", return null meaning "no restriction".
  // Example: EMPLOYEE + GLOBAL scope (you already do similar in inventory service).
  // If you don't have it here, comment this out.
  // if (Number(auth.user_type) === UserType.EMPLOYEE && this.hasGlobalScope(auth)) return null;

  const scopes = await this.ds.query(
    `
    select org_node_id
    from md_user_scope
    where company_id=$1
      and user_id=$2
      and scope_type=$3
      and org_node_id is not null
    `,
    [auth.company_id, uid, ScopeType.HIERARCHY],
  );

  const rootIds = (scopes ?? []).map((r: any) => String(r.org_node_id));
  if (!rootIds.length) return []; // has hierarchy restriction but no nodes

  // Expand each scope node to all descendant territories (level_no=5)
  // Works even if root is already territory.
  const rows = await this.ds.query(
    `
    with recursive tree as (
      select id, parent_id, level_no
      from md_org_hierarchy
      where company_id=$1
        and id = any($2::bigint[])
        and deleted_at is null
        and status=1

      union all

      select c.id, c.parent_id, c.level_no
      from md_org_hierarchy c
      join tree t on t.id = c.parent_id
      where c.company_id=$1
        and c.deleted_at is null
        and c.status=1
    )
    select distinct id
    from tree
    where level_no=5
    `,
    [auth.company_id, rootIds.map((x) => Number(x))],
  );

  return (rows ?? []).map((r: any) => String(r.id));
}

}
