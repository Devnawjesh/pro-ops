// src/modules/inventory/services/transfer.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';

import {
  InvLotSourceDocType,
  InvTxnType,
  RefDocType,
  UserType,
  WarehouseOwnerType,
} from '../../common/constants/enums';

import { InvTransfer } from './entities/inv_transfer.entity';
import { InvTransferItem } from './entities/inv_transfer_item.entity';
import { InvTxn } from './entities/inv_txn.entity';
import { InvTxnLot } from './entities/inv_txn_lot.entity';
import { InvLot } from './entities/inv_lot.entity';

import { CreateTransferDto } from './dto/transfer/create-transfer.dto';
import { ListTransferDto } from './dto/transfer/list-transfer.dto';
import { ReceiveTransferDto } from './dto/transfer/receive-transfer.dto';

import {
  AuthUser,
  ensurePositiveDec,
  parseDateOrThrow,
  InventoryCommonService,
} from './inventory-common.service';

/**
 * User-friendly statuses (no DRAFT).
 * - DISPATCHED: created+dispatched by admin immediately
 * - PARTIAL: distributor received some but not all
 * - RECEIVED: distributor received all
 */
export enum TransferStatus {
  DISPATCHED = 2,
  RECEIVED = 3,
  PARTIAL = 4,
  CANCELLED = 9,
}

@Injectable()
export class TransferService {
  constructor(
    private readonly common: InventoryCommonService,

    @InjectRepository(InvTransfer) private readonly transferRepo: Repository<InvTransfer>,
    @InjectRepository(InvTransferItem) private readonly transferItemRepo: Repository<InvTransferItem>,
    @InjectRepository(InvTxn) private readonly txnRepo: Repository<InvTxn>,
    @InjectRepository(InvTxnLot) private readonly txnLotRepo: Repository<InvTxnLot>,
    @InjectRepository(InvLot) private readonly lotRepo: Repository<InvLot>,
  ) {}

  // =========================================================
  // CREATE + DISPATCH (ADMIN)
  // =========================================================
  async createAndDispatch(auth: AuthUser, dto: CreateTransferDto) {
    const company_id = auth.company_id;

    // basic payload checks
    if (!dto?.transfer_no?.trim()) throw new BadRequestException('transfer_no is required');
    if (!dto?.transfer_date) throw new BadRequestException('transfer_date is required');
    if (!dto?.from_warehouse_id) throw new BadRequestException('from_warehouse_id is required');
    if (!dto?.to_warehouse_id) throw new BadRequestException('to_warehouse_id is required');
    if (String(dto.from_warehouse_id) === String(dto.to_warehouse_id)) {
      throw new BadRequestException('from_warehouse_id and to_warehouse_id cannot be same');
    }
    if (!Array.isArray(dto.items) || dto.items.length === 0) throw new BadRequestException('items is required');

    // Access control + business rules
    const fromWh = await this.common.assertWarehouseAccessible(auth, String(dto.from_warehouse_id));
    const toWh = await this.common.assertWarehouseAccessible(auth, String(dto.to_warehouse_id));

    // Must be CENTER -> DISTRIBUTOR
    if (Number((fromWh as any).owner_type) !== WarehouseOwnerType.COMPANY) {
      throw new BadRequestException('Transfer must originate from center warehouse');
    }
    if (Number((toWh as any).owner_type) !== WarehouseOwnerType.DISTRIBUTOR) {
      throw new BadRequestException('Transfer destination must be distributor warehouse');
    }

    // validate lines
    const seen = new Set<number>();
    for (const it of dto.items) {
      const ln = Number((it as any).line_no);
      if (!Number.isFinite(ln) || ln <= 0) throw new BadRequestException(`Invalid line_no: ${String((it as any).line_no)}`);
      if (seen.has(ln)) throw new BadRequestException(`Duplicate line_no: ${ln}`);
      seen.add(ln);

      if (!(it as any).sku_id) throw new BadRequestException(`sku_id is required (line ${ln})`);

      // NOTE: you said you want no draft; so qty_planned in your dto is effectively qty_dispatch now
      ensurePositiveDec(`qty_planned/qty_dispatch (line ${ln})`, (it as any).qty_planned);
    }

    const dispatchedAt = new Date();

    return this.common.dataSource.transaction(async (manager) => {
      const trRepo = manager.getRepository(InvTransfer);
      const itemRepo = manager.getRepository(InvTransferItem);
      const txnRepo = manager.getRepository(InvTxn);
      const txnLotRepo = manager.getRepository(InvTxnLot);

      // unique transfer_no
      const dup = await trRepo.findOne({
        where: { company_id, transfer_no: dto.transfer_no.trim(), deleted_at: null } as any,
      });
      if (dup) throw new ConflictException('Transfer no already exists');

      // 1) transfer header
      const tr = trRepo.create({
        company_id,
        transfer_no: dto.transfer_no.trim(),
        transfer_date: dto.transfer_date,
        status: TransferStatus.DISPATCHED,
        from_warehouse_id: String(dto.from_warehouse_id),
        to_warehouse_id: String(dto.to_warehouse_id),
        dispatched_at: dispatchedAt,
        received_at: null,
        created_by_user_id: this.common.actorId(auth),
      } as any);
      const savedTr = await trRepo.save(tr);
      const transferId = String((savedTr as any).id);

      // 2) items (dispatched immediately => dispatched_total = planned)
      const payload: DeepPartial<InvTransferItem>[] = dto.items.map((it: any) => ({
        company_id,
        transfer_id: transferId,
        line_no: Number(it.line_no),
        sku_id: String(it.sku_id),
        qty_planned: String(it.qty_planned),
        qty_dispatched_total: String(it.qty_planned),
        qty_received_total: '0',
      }));

      const savedItems = await itemRepo.save(itemRepo.create(payload));

      // 3) create OUT txn + FIFO allocate lots + decrease balance
      for (const it of savedItems as any[]) {
        const qtyOut = Number(it.qty_dispatched_total);
        if (!Number.isFinite(qtyOut) || qtyOut <= 0) {
          throw new BadRequestException(`Invalid dispatched qty (line ${it.line_no})`);
        }

        const txn = await txnRepo.save(
          txnRepo.create({
            company_id,
            txn_time: dispatchedAt,
            txn_type: InvTxnType.TRANSFER_OUT,
            warehouse_id: String(dto.from_warehouse_id),
            sku_id: String(it.sku_id),
            qty_in: '0',
            qty_out: String(qtyOut),
            ref_doc_type: RefDocType.TRANSFER,
            ref_doc_id: transferId,
            remarks: (dto as any).remarks ?? null,
            created_by: this.common.actorId(auth),
          } as any),
        );

        // allocate lots from CENTER warehouse
        const alloc = await this.common.allocateLotsFIFO(manager, {
          company_id,
          warehouse_id: String(dto.from_warehouse_id),
          sku_id: String(it.sku_id),
          qty_out: String(qtyOut),
        });

        for (const a of alloc) {
          await txnLotRepo.save(
            txnLotRepo.create({
              company_id,
              inv_txn_id: String((txn as any).id),
              lot_id: a.lot_id,
              qty: a.qty,
            } as any),
          );
        }

        // stock on-hand decrease in from_warehouse
        await this.common.applyBalanceDelta(manager, {
          company_id,
          warehouse_id: String(dto.from_warehouse_id),
          sku_id: String(it.sku_id),
          delta_on_hand: String(-qtyOut),
          delta_reserved: '0',
        });
      }

      return { id: transferId, status: TransferStatus.DISPATCHED };
    });
  }

  // =========================================================
  // LIST (ADMIN / INTERNAL) - general list with filters
  // =========================================================
  async list(auth: AuthUser, q: ListTransferDto) {
    const company_id = auth.company_id;
    const { page, limit, skip } = this.common.normalizePage(q);

    const qb = this.transferRepo
      .createQueryBuilder('t')
      .where('t.company_id=:cid', { cid: company_id })
      .andWhere('t.deleted_at IS NULL');

    // if non-global external users: restrict
    if (!this.common.hasGlobalScope(auth) && (this.common.isDistUser(auth) || this.common.isSubDistUser(auth))) {
      const whIds = await this.common.listMyWarehouseIds(auth);
      qb.andWhere('t.to_warehouse_id IN (:...wids)', { wids: whIds.length ? whIds : ['-1'] });
    }

    if (q.status !== undefined) qb.andWhere('t.status=:st', { st: q.status });
    if (q.from_warehouse_id) qb.andWhere('t.from_warehouse_id=:fw', { fw: q.from_warehouse_id });
    if (q.to_warehouse_id) qb.andWhere('t.to_warehouse_id=:tw', { tw: q.to_warehouse_id });
    if (q.from_date) qb.andWhere('t.transfer_date >= :fd', { fd: q.from_date });
    if (q.to_date) qb.andWhere('t.transfer_date <= :td', { td: q.to_date });
    if (q.q?.trim()) qb.andWhere('t.transfer_no ILIKE :qq', { qq: `%${q.q.trim()}%` });

    const total = await qb.getCount();

    const rows = await qb
      .select([
        't.id AS id',
        't.transfer_no AS transfer_no',
        't.transfer_date AS transfer_date',
        't.status AS status',
        't.from_warehouse_id AS from_warehouse_id',
        't.to_warehouse_id AS to_warehouse_id',
        't.dispatched_at AS dispatched_at',
        't.received_at AS received_at',
        't.created_at AS created_at',
        't.updated_at AS updated_at',
      ])
      .orderBy('t.id', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, pages: Math.ceil(total / limit), rows };
  }

  // =========================================================
  // INCOMING (DISTRIBUTOR USER) - sees DISPATCHED/PARTIAL
  // =========================================================
async listIncoming(auth: AuthUser, q: ListTransferDto) {
  const company_id = auth.company_id;
  const { page, limit, skip } = this.common.normalizePage(q);

  const whIds = await this.common.listMyWarehouseIds(auth);
  if (!whIds.length) {
    return { success: true, message: 'OK', data: { page, limit, total: 0, pages: 0, rows: [] } };
  }

  const qb = this.transferRepo
    .createQueryBuilder('t')
    .leftJoin(InvTransferItem, 'it', 'it.transfer_id = t.id AND it.company_id = t.company_id')
    // adjust table name/columns if your SKU master differs
    .leftJoin('md_sku', 's', 's.id = it.sku_id AND s.company_id = t.company_id AND s.deleted_at IS NULL')
    .where('t.company_id=:cid', { cid: company_id })
    .andWhere('t.deleted_at IS NULL')
    .andWhere('t.to_warehouse_id IN (:...wids)', { wids: whIds })
    .andWhere('t.status IN (:...st)', { st: [2, 4] }); // DISPATCHED or PARTIAL

  if (q.from_date) qb.andWhere('t.transfer_date >= :fd', { fd: q.from_date });
  if (q.to_date) qb.andWhere('t.transfer_date <= :td', { td: q.to_date });
  if (q.q?.trim()) qb.andWhere('t.transfer_no ILIKE :qq', { qq: `%${q.q.trim()}%` });

  // IMPORTANT: count distinct transfers (because join duplicates rows)
  const totalRow = await qb.clone().select('COUNT(DISTINCT t.id)', 'cnt').getRawOne();
  const total = Number(totalRow?.cnt ?? 0);

  const rows = await qb
    .select([
      't.id AS id',
      't.transfer_no AS transfer_no',
      't.transfer_date AS transfer_date',
      't.status AS status',
      't.from_warehouse_id AS from_warehouse_id',
      't.to_warehouse_id AS to_warehouse_id',
      't.dispatched_at AS dispatched_at',

      // summary fields
      'COUNT(DISTINCT it.id) AS sku_count',
      "COALESCE(SUM(it.qty_dispatched_total::numeric), 0) AS qty_dispatched_total",
      "COALESCE(SUM(it.qty_received_total::numeric), 0) AS qty_received_total",

      // optional: show one sku in list (nice UX)
      'MAX(s.code) AS sku_code',
      'MAX(s.name) AS sku_name',
    ])
    .groupBy('t.id')
    .orderBy('t.id', 'DESC')
    .offset(skip)
    .limit(limit)
    .getRawMany();

  return { page, limit, total, pages: Math.ceil(total / limit), rows };
}


  // =========================================================
  // GET DETAILS (with SKU code+name join)
  // NOTE: Replace md_sku table/columns if your master differs.
  // =========================================================
async get(auth: AuthUser, id: string) {
  const company_id = auth.company_id;

  const tr = await this.transferRepo.findOne({ where: { id, company_id, deleted_at: null } as any });
  if (!tr) throw new NotFoundException('Transfer not found');

  // ✅ distributor will NOT be blocked by center warehouse now
  await this.common.assertTransferReadable(auth, tr as any);

  const items = await this.transferItemRepo
    .createQueryBuilder('it')
    .leftJoin('md_sku', 's', 's.id = it.sku_id AND s.company_id = it.company_id AND s.deleted_at IS NULL')
    .where('it.company_id=:cid', { cid: company_id })
    .andWhere('it.transfer_id=:tid', { tid: id })
    .select([
      'it.line_no AS line_no',
      'it.sku_id AS sku_id',
      's.code AS sku_code',
      's.name AS sku_name',
      'it.qty_planned AS qty_planned',
      'it.qty_dispatched_total AS qty_dispatched_total',
      'it.qty_received_total AS qty_received_total',
    ])
    .orderBy('it.line_no', 'ASC')
    .getRawMany();

  return { transfer: tr, items };
}



  // =========================================================
  // RECEIVE (DISTRIBUTOR) - partial or full
  // =========================================================
  async receive(auth: AuthUser, transferId: string, dto: ReceiveTransferDto) {
    const company_id = auth.company_id;

    if (!dto?.lines?.length) throw new BadRequestException('lines is required');

    const tr = await this.transferRepo.findOne({ where: { id: transferId, company_id, deleted_at: null } as any });
    if (!tr) throw new NotFoundException('Transfer not found');

    const status = Number((tr as any).status);
    if (![TransferStatus.DISPATCHED, TransferStatus.PARTIAL].includes(status)) {
      throw new BadRequestException('Transfer must be DISPATCHED/PARTIAL to receive');
    }

    const to_warehouse_id = String((tr as any).to_warehouse_id);
    // This also guarantees distributor can only receive into their own warehouse
    await this.common.assertWarehouseAccessible(auth, to_warehouse_id);

    const receivedAt = parseDateOrThrow('received_at', dto.received_at);

    // validate lines
    const seen = new Set<number>();
    for (const ln of dto.lines as any[]) {
      const line_no = Number(ln.line_no);
      if (!Number.isFinite(line_no) || line_no <= 0) throw new BadRequestException(`Invalid line_no: ${ln.line_no}`);
      if (seen.has(line_no)) throw new BadRequestException(`Duplicate line_no: ${line_no}`);
      seen.add(line_no);
      ensurePositiveDec(`qty_receive (line ${line_no})`, ln.qty_receive);
    }

    return this.common.dataSource.transaction(async (manager) => {
      const itemRepo = manager.getRepository(InvTransferItem);
      const txnRepo = manager.getRepository(InvTxn);
      const txnLotRepo = manager.getRepository(InvTxnLot);
      const lotRepo = manager.getRepository(InvLot);
      const trRepo = manager.getRepository(InvTransfer);

      // lock items (optional: if you want strict concurrency use FOR UPDATE query via manager.query)
      const items = await itemRepo.find({ where: { company_id, transfer_id: transferId } as any });
      const byLine = new Map<number, any>(items.map((x: any) => [Number(x.line_no), x]));

      for (const ln of dto.lines as any[]) {
        const row = byLine.get(Number(ln.line_no));
        if (!row) throw new BadRequestException(`Transfer line not found: ${ln.line_no}`);

        const dispatched = Number(row.qty_dispatched_total ?? 0);
        const received = Number(row.qty_received_total ?? 0);
        const add = Number(ln.qty_receive);

        if (add <= 0 || !Number.isFinite(add)) {
          throw new BadRequestException(`Invalid qty_receive (line ${ln.line_no})`);
        }

        if (received + add > dispatched + 0.0000001) {
          throw new BadRequestException(`Receive exceeds dispatched_total (line ${ln.line_no})`);
        }

        // IN txn
        const txn = await txnRepo.save(
          txnRepo.create({
            company_id,
            txn_time: receivedAt,
            txn_type: InvTxnType.TRANSFER_IN,
            warehouse_id: to_warehouse_id,
            sku_id: String(row.sku_id),
            qty_in: String(add),
            qty_out: '0',
            ref_doc_type: RefDocType.TRANSFER,
            ref_doc_id: transferId,
            remarks: dto.remarks ?? null,
            created_by: this.common.actorId(auth),
          } as any),
        );

        // create destination lot (simple approach)
        const lot = await lotRepo.save(
          lotRepo.create({
            company_id,
            warehouse_id: to_warehouse_id,
            sku_id: String(row.sku_id),
            source_doc_type: InvLotSourceDocType.TRANSFER_IN,
            source_doc_id: transferId,
            received_at: receivedAt,
            batch_no: ln.batch_no ?? null,
            expiry_date: ln.expiry_date ?? null,
            unit_cost: null,
            qty_received: String(add),
            qty_available: String(add),
          } as any),
        );

        // link txn to lot
        await txnLotRepo.save(
          txnLotRepo.create({
            company_id,
            inv_txn_id: String((txn as any).id),
            lot_id: String((lot as any).id),
            qty: String(add),
          } as any),
        );

        // update item received total
        row.qty_received_total = String(received + add);
        await itemRepo.save(row);

        // increase stock in destination
        await this.common.applyBalanceDelta(manager, {
          company_id,
          warehouse_id: to_warehouse_id,
          sku_id: String(row.sku_id),
          delta_on_hand: String(add),
          delta_reserved: '0',
        });
      }

      // refresh and set header status
      const refreshed = await itemRepo.find({ where: { company_id, transfer_id: transferId } as any });

      const anyReceived = refreshed.some((x: any) => Number(x.qty_received_total ?? 0) > 0);
      const allDone = refreshed.every(
        (x: any) =>
          Number(x.qty_received_total ?? 0) + 0.0000001 >= Number(x.qty_dispatched_total ?? 0),
      );

      if (allDone) {
        (tr as any).status = TransferStatus.RECEIVED;
        (tr as any).received_at = (tr as any).received_at ?? receivedAt;
      } else if (anyReceived) {
        (tr as any).status = TransferStatus.PARTIAL;
      }

      (tr as any).updated_at = new Date();
      (tr as any).updated_by = this.common.actorId(auth);
      await trRepo.save(tr as any);

      return{
          id: transferId,
          status: Number((tr as any).status),
          received_full: allDone
      };
    });
  }
}
