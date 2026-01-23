import { ForbiddenException, Injectable } from '@nestjs/common'; 
import { InjectRepository } from '@nestjs/typeorm'; 
import { Repository } from 'typeorm'; 
import { UserType, ScopeType, WarehouseOwnerType } from '../../common/constants/enums'; 
import { InvStockBalance } from './entities/inv_stock_balance.entity'; 
import { MdWarehouse } from '../master/entities/md_warehouse.entity'; 
import { ListStockDto } from './dto/stock/list-stock.dto'; 
import { InventoryCommonService, AuthUser } from './inventory-common.service'; 
import { InvLot } from './entities/inv_lot.entity'; 
import { ListLotDto } from './dto/stock/list-lot.dto';
import { ListStockAlertsDto } from './dto/stock/ListStockAlertsDto.dto';

@Injectable()
export class StockService {
  constructor(
    private readonly common: InventoryCommonService,
    @InjectRepository(InvStockBalance) private readonly balRepo: Repository<InvStockBalance>,
    @InjectRepository(MdWarehouse) private readonly whRepo: Repository<MdWarehouse>,
    @InjectRepository(InvLot) private readonly lotRepo: Repository<InvLot>,
  ) {}

  // =========================================================
  // STOCK BALANCE LIST
  // =========================================================
  async list(auth: AuthUser, q: ListStockDto) {
    const company_id = auth.company_id;
    const { page, limit, skip } = this.common.normalizePage(q);

    // ✅ Single, consistent scope
    const scope = await this.common.resolveInventoryWarehouseScope(auth);
    const allowedWarehouseIds = scope.allowedWarehouseIds ?? [];

    if (!allowedWarehouseIds.length) {
      throw new ForbiddenException('No inventory scope assigned');
    }

    const qb = this.balRepo
      .createQueryBuilder('b')
      .where('b.company_id=:cid', { cid: company_id })
      .andWhere('b.warehouse_id IN (:...wids)', { wids: allowedWarehouseIds })
      .leftJoin(
        'md_sku',
        's',
        's.id = b.sku_id AND s.company_id = b.company_id AND s.deleted_at IS NULL',
      )
      .leftJoin(
        'md_warehouse',
        'w',
        'w.id = b.warehouse_id AND w.company_id = b.company_id AND w.deleted_at IS NULL',
      )
      .leftJoin(
        'md_distributor',
        'd',
        `d.id = w.owner_id AND d.company_id = b.company_id AND d.deleted_at IS NULL`,
      );

    // filters
    if (q.warehouse_id) {
      const wid = String(q.warehouse_id);
      if (!allowedWarehouseIds.includes(wid)) throw new ForbiddenException('No access to this warehouse');
      qb.andWhere('b.warehouse_id=:wid', { wid });
    }

    if (q.sku_id) qb.andWhere('b.sku_id=:sid', { sid: q.sku_id });

    // Optional: allow filtering by distributor ONLY within allowed warehouses
    if ((q as any).distributor_id) {
      qb.andWhere('w.owner_type = :ot', { ot: WarehouseOwnerType.DISTRIBUTOR });
      qb.andWhere('w.owner_id = :did', { did: String((q as any).distributor_id) });
    }

    const onlyAvail = Number((q as any).only_available ?? 1) === 1;
    const includeZero = Number((q as any).include_zero ?? 0) === 1;

    if (onlyAvail) qb.andWhere('b.qty_on_hand > 0');
    else if (!includeZero) qb.andWhere('b.qty_on_hand <> 0');

    if (q.q?.trim()) {
      qb.andWhere('(s.code ILIKE :qq OR s.name ILIKE :qq)', { qq: `%${q.q.trim()}%` });
    }

    const total = await qb.getCount();

    const sortBy = (q as any).sort_by ?? 'updated_at';
    const sortDir = String((q as any).sort_dir ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sortMap: Record<string, string> = {
      sku: 's.code',
      qty_on_hand: 'b.qty_on_hand',
      updated_at: 'b.updated_at',
    };

    qb.orderBy(sortMap[sortBy] ?? 'b.updated_at', sortDir as any).addOrderBy('b.id', 'DESC');

    const rows = await qb
      .select([
        'b.id AS id',
        'b.warehouse_id AS warehouse_id',
        'b.sku_id AS sku_id',
        's.code AS sku_code',
        's.name AS sku_name',
        'd.id AS distributor_id',
        'd.code AS distributor_code',
        'd.name AS distributor_name',
        'b.qty_on_hand AS qty_on_hand',
        'b.qty_reserved AS qty_reserved',
        'b.updated_at AS updated_at',
      ])
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, pages: Math.ceil(total / limit), rows };
  }

  // =========================================================
  // LOT LIST
  // =========================================================
  async listLots(auth: AuthUser, q: ListLotDto) {
    const company_id = auth.company_id;
    const { page, limit, skip } = this.common.normalizePage(q);

    // ✅ Single, consistent scope
    const scope = await this.common.resolveInventoryWarehouseScope(auth);
    const allowedWarehouseIds = scope.allowedWarehouseIds ?? [];

    if (!allowedWarehouseIds.length) {
      throw new ForbiddenException('No inventory scope assigned');
    }

    const qb = this.lotRepo
      .createQueryBuilder('l')
      .where('l.company_id=:cid', { cid: company_id })
      .andWhere('l.warehouse_id IN (:...wids)', { wids: allowedWarehouseIds })
      .leftJoin(
        'md_sku',
        's',
        's.id = l.sku_id AND s.company_id = l.company_id AND s.deleted_at IS NULL',
      )
      .leftJoin(
        'md_warehouse',
        'w',
        'w.id = l.warehouse_id AND w.company_id = l.company_id AND w.deleted_at IS NULL',
      );

    // filters
    if (q.warehouse_id) {
      const wid = String(q.warehouse_id);
      if (!allowedWarehouseIds.includes(wid)) throw new ForbiddenException('No access to this warehouse');
      qb.andWhere('l.warehouse_id=:wid', { wid });
    }

    if (q.sku_id) qb.andWhere('l.sku_id=:sid', { sid: q.sku_id });

    const onlyAvail = Number((q as any).only_available ?? 1) === 1;
    if (onlyAvail) qb.andWhere('l.qty_available > 0');

    if (q.expiry_before) qb.andWhere('l.expiry_date <= :eb', { eb: q.expiry_before });

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'l.id AS lot_id',
        'l.warehouse_id AS warehouse_id',
        'w.code AS warehouse_code',
        'w.name AS warehouse_name',

        'l.sku_id AS sku_id',
        's.code AS sku_code',
        's.name AS sku_name',

        'l.batch_no AS batch_no',
        'l.expiry_date AS expiry_date',
        'l.received_at AS received_at',

        'l.qty_received AS qty_received',
        'l.qty_available AS qty_available',

        'l.source_doc_type AS source_doc_type',
        'l.source_doc_id AS source_doc_id',
      ])
      .orderBy('s.code', 'ASC')
      .addOrderBy('l.expiry_date', 'ASC', 'NULLS LAST')
      .addOrderBy('l.received_at', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, pages: Math.ceil(total / limit), rows };
  }
async listAlerts(auth: AuthUser, dto: ListStockAlertsDto) {
  if (dto.companyId && String(dto.companyId) !== String(auth.company_id)) {
    throw new ForbiddenException('Invalid company scope');
  }
  const company_id = String(dto.companyId ?? auth.company_id);

  // paging coercion
  (dto as any).page = dto.page != null ? Number(dto.page) : undefined;
  (dto as any).limit = dto.limit != null ? Number(dto.limit) : undefined;

  const scope = await this.common.resolveInventoryWarehouseScopeForAlerts(auth);
  const allowedWarehouseIds = scope.allowedWarehouseIds ?? [];
  if (!allowedWarehouseIds.length) throw new ForbiddenException('No inventory scope assigned');

  // ✅ Make IN values numeric to match bigint column
  const allowedWids = allowedWarehouseIds.map((x) => Number(x)).filter((n) => Number.isFinite(n));

  console.log('ALERTS company_id=', company_id);
  console.log('ALERTS allowedWids=', allowedWids);

  const { page, limit, skip } = this.common.normalizePage(dto as any);

  // ---------------------------
  // STEP DEBUG COUNTS
  // ---------------------------
  const c1 = await this.balRepo
    .createQueryBuilder('b')
    .where('b.company_id = :cid', { cid: company_id })
    .andWhere('b.warehouse_id IN (:...wids)', { wids: allowedWids })
    .getCount();
  console.log('ALERTS count balances in allowed warehouses =', c1);

  const c2 = await this.balRepo
    .createQueryBuilder('b')
    .innerJoin('md_warehouse', 'w', `w.id = b.warehouse_id AND w.company_id = b.company_id AND w.deleted_at IS NULL`)
    .where('b.company_id = :cid', { cid: company_id })
    .andWhere('b.warehouse_id IN (:...wids)', { wids: allowedWids })
    .andWhere('w.owner_type = :ot', { ot: 2 })
    .getCount();
  console.log('ALERTS count after owner_type=2 join =', c2);

  const baseQb = this.balRepo
    .createQueryBuilder('b')
    .innerJoin('md_warehouse', 'w', `w.id = b.warehouse_id AND w.company_id = b.company_id AND w.deleted_at IS NULL`)
    .leftJoin(
      'inv_distributor_stock_policy',
      'p',
      `p.company_id = b.company_id
       AND p.deleted_at IS NULL
       AND p.status = 'active'
       AND p.distributor_id = w.owner_id
       AND p.sku_id = b.sku_id`,
    )
    .where('b.company_id = :cid', { cid: company_id })
    .andWhere('b.warehouse_id IN (:...wids)', { wids: allowedWids })
    .andWhere('w.owner_type = :ot', { ot: 2 });

  if (dto.type === 'LOW') {
    baseQb.andWhere('p.min_qty IS NOT NULL AND b.qty_on_hand <= p.min_qty');
  } else {
    baseQb.andWhere('p.max_qty IS NOT NULL AND b.qty_on_hand >= p.max_qty');
  }

  const c3row = await baseQb.clone().select('COUNT(DISTINCT b.id)', 'cnt').getRawOne();
  const total = Number(c3row?.cnt ?? 0);
  console.log('ALERTS count after policy threshold condition =', total);

  // ---------------------------
  // ROWS QUERY
  // ---------------------------
  const rowsQb = baseQb
    .clone()
    .leftJoin('md_sku', 's', `s.id = b.sku_id AND s.company_id = b.company_id AND s.deleted_at IS NULL`)
    .leftJoin('md_distributor', 'dist', `dist.id = w.owner_id AND dist.company_id = b.company_id AND dist.deleted_at IS NULL`)
    .select([
      'b.id AS id',
      'b.warehouse_id AS warehouse_id',
      'w.code AS warehouse_code',
      'w.name AS warehouse_name',

      'b.sku_id AS sku_id',
      's.code AS sku_code',
      's.name AS sku_name',

      'w.owner_id AS distributor_id',
      'dist.code AS distributor_code',
      'dist.name AS distributor_name',

      'b.qty_on_hand AS qty_on_hand',
      'b.qty_reserved AS qty_reserved',

      'p.min_qty AS min_qty',
      'p.max_qty AS max_qty',

      'b.updated_at AS updated_at',
    ]);

  if (dto.type === 'LOW') rowsQb.orderBy('b.qty_on_hand', 'ASC');
  else rowsQb.orderBy('b.qty_on_hand', 'DESC');

  const rows = await rowsQb.offset(skip).limit(limit).getRawMany();

  return { page, limit, total, pages: Math.ceil(total / limit), rows };
}

}
