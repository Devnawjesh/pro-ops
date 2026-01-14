// src/modules/inventory/services/grn.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';

import {
  InvLotSourceDocType,
  InvTxnType,
  RefDocType,
} from '../../common/constants/enums';

import { InvGrn } from './entities/inv_grn.entity';
import { InvGrnItem } from './entities/inv_grn_item.entity';
import { InvTxn } from './entities/inv_txn.entity';
import { InvTxnLot } from './entities/inv_txn_lot.entity';
import { InvLot } from './entities/inv_lot.entity';

import { CreateGrnDto } from './dto/create-grn.dto';
import { UpdateGrnDto } from './dto/update-grn.dto';
import { ListGrnDto } from './dto/list-grn.dto';
import { ReceiveGrnDto, ReceiveGrnLineDto } from './dto/receive-grn.dto';
import { PostGrnDto } from './dto/post-grn.dto';
import { ReportGrnItemsDto } from './dto/report-grn-items.dto';

import {
  InventoryCommonService,
  AuthUser,
  asDec,
  ensureNonNegativeDec,
  ensurePositiveDec,
  parseDateOrThrow,
} from './inventory-common.service';

@Injectable()
export class GrnService {
  constructor(
    private readonly common: InventoryCommonService,

    @InjectRepository(InvGrn) private readonly grnRepo: Repository<InvGrn>,
    @InjectRepository(InvGrnItem) private readonly grnItemRepo: Repository<InvGrnItem>,
    @InjectRepository(InvTxn) private readonly txnRepo: Repository<InvTxn>,
    @InjectRepository(InvTxnLot) private readonly txnLotRepo: Repository<InvTxnLot>,
    @InjectRepository(InvLot) private readonly lotRepo: Repository<InvLot>,
  ) {}

  async create(auth: AuthUser, dto: CreateGrnDto) {
    const company_id = auth.company_id;

    if (!dto.grn_no?.trim()) throw new BadRequestException('grn_no is required');
    if (!dto.grn_date) throw new BadRequestException('grn_date is required');
    if (!dto.warehouse_id) throw new BadRequestException('warehouse_id is required');
    if (!dto.items?.length) throw new BadRequestException('items is required');

    await this.common.assertWarehouseAccessible(auth, dto.warehouse_id);

    const seen = new Set<number>();
    for (const it of dto.items) {
      if (seen.has(it.line_no)) throw new BadRequestException(`Duplicate line_no: ${it.line_no}`);
      seen.add(it.line_no);

      if (!it.sku_id) throw new BadRequestException(`sku_id is required (line ${it.line_no})`);
      ensurePositiveDec(`qty_expected (line ${it.line_no})`, it.qty_expected);
      if (it.unit_cost != null) ensureNonNegativeDec(`unit_cost (line ${it.line_no})`, it.unit_cost);
    }

    if (dto.receive_lines?.length) this.validateReceiveLines(dto.receive_lines);

    return this.common.dataSource.transaction(async (manager) => {
      const dup = await manager.getRepository(InvGrn).findOne({
        where: { company_id, grn_no: dto.grn_no.trim(), deleted_at: null } as any,
      });
      if (dup) throw new ConflictException('GRN no already exists');

      const grn = manager.getRepository(InvGrn).create({
        company_id,
        grn_no: dto.grn_no.trim(),
        grn_date: dto.grn_date,
        status: 1,
        warehouse_id: dto.warehouse_id,
        supplier_name: dto.supplier_name?.trim() ?? null,
        reference_no: dto.reference_no?.trim() ?? null,
        created_by_user_id: this.common.actorId(auth),
      } as any);

      const saved = await manager.getRepository(InvGrn).save(grn);
      const grnId = String((saved as any).id);

      const itemRepo = manager.getRepository(InvGrnItem);
      const payload: DeepPartial<InvGrnItem>[] = dto.items.map((it) => ({
        company_id,
        grn_id: grnId,
        line_no: it.line_no,
        sku_id: it.sku_id,
        qty_expected: asDec(it.qty_expected)!,
        qty_received_total: '0',
        unit_cost: it.unit_cost != null ? asDec(it.unit_cost) : null,
      }));
      await itemRepo.save(itemRepo.create(payload));

      if (dto.receive_lines?.length) {
        await this.receiveLinesTx(manager, auth, grnId, {
          received_at: dto.grn_date,
          lines: dto.receive_lines,
          remarks: 'Receive at create',
        });
      }

      if (dto.auto_post) {
        await this.postTx(manager, auth, grnId, { remarks: 'Auto-post' });
      }

      return { success: true, message: 'OK', data: { id: grnId } };
    });
  }

  async list(auth: AuthUser, q: ListGrnDto) {
    const company_id = auth.company_id;
    const { page, limit, skip } = this.common.normalizePage(q);

    const qb = this.grnRepo
      .createQueryBuilder('g')
      .where('g.company_id=:cid', { cid: company_id })
      .andWhere('g.deleted_at IS NULL');

    if (!this.common.hasGlobalScope(auth) && (this.common.isDistUser(auth) || this.common.isSubDistUser(auth))) {
      const whIds = await this.common.listMyWarehouseIds(auth);
      qb.andWhere('g.warehouse_id IN (:...wids)', { wids: whIds.length ? whIds : ['-1'] });
    }

    if (q.status !== undefined) qb.andWhere('g.status=:st', { st: q.status });
    if (q.warehouse_id) qb.andWhere('g.warehouse_id=:wid', { wid: q.warehouse_id });
    if (q.from_date) qb.andWhere('g.grn_date >= :fd', { fd: q.from_date });
    if (q.to_date) qb.andWhere('g.grn_date <= :td', { td: q.to_date });

    if (q.q?.trim()) {
      qb.andWhere('(g.grn_no ILIKE :qq OR g.supplier_name ILIKE :qq OR g.reference_no ILIKE :qq)', {
        qq: `%${q.q.trim()}%`,
      });
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'g.id AS id',
        'g.grn_no AS grn_no',
        'g.grn_date AS grn_date',
        'g.status AS status',
        'g.warehouse_id AS warehouse_id',
        'g.supplier_name AS supplier_name',
        'g.reference_no AS reference_no',
        'g.created_at AS created_at',
        'g.updated_at AS updated_at',
      ])
      .orderBy('g.id', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, pages: Math.ceil(total / limit), rows };
  }

  async get(auth: AuthUser, id: string) {
    const company_id = auth.company_id;

    const grn = await this.grnRepo.findOne({ where: { id, company_id, deleted_at: null } as any });
    if (!grn) throw new NotFoundException('GRN not found');

    await this.common.assertWarehouseAccessible(auth, String((grn as any).warehouse_id));

    const items = await this.grnItemRepo
      .createQueryBuilder('gi')
      .leftJoin('md_sku', 's', 's.id = gi.sku_id')
      .where('gi.company_id=:cid', { cid: company_id })
      .andWhere('gi.grn_id=:gid', { gid: id })
      .select([
        'gi.id AS id',
        'gi.line_no AS line_no',
        'gi.sku_id AS sku_id',
        's.code AS sku_code',
        's.name AS sku_name',
        'gi.qty_expected AS qty_expected',
        'gi.qty_received_total AS qty_received_total',
        'gi.unit_cost AS unit_cost',
      ])
      .orderBy('gi.line_no', 'ASC')
      .getRawMany();

    return { grn, items };
  }

  async update(auth: AuthUser, id: string, dto: UpdateGrnDto) {
    const company_id = auth.company_id;
    const actor = this.common.actorId(auth);

    const grn = await this.grnRepo.findOne({ where: { id, company_id, deleted_at: null } as any });
    if (!grn) throw new NotFoundException('GRN not found');

    if (Number((grn as any).status) !== 1) throw new BadRequestException('Only DRAFT GRN can be updated');

    const targetWarehouseId = dto.warehouse_id ?? String((grn as any).warehouse_id);
    await this.common.assertWarehouseAccessible(auth, targetWarehouseId);

    if (
      dto.grn_no === undefined &&
      dto.grn_date === undefined &&
      dto.warehouse_id === undefined &&
      dto.supplier_name === undefined &&
      dto.reference_no === undefined &&
      dto.items === undefined
    ) throw new BadRequestException('Empty payload');

    return this.common.dataSource.transaction(async (manager) => {
      if (dto.grn_no?.trim() && dto.grn_no.trim() !== String((grn as any).grn_no)) {
        const dup = await manager.getRepository(InvGrn).findOne({
          where: { company_id, grn_no: dto.grn_no.trim(), deleted_at: null } as any,
        });
        if (dup) throw new ConflictException('GRN no already exists');
        (grn as any).grn_no = dto.grn_no.trim();
      }

      if (dto.grn_date !== undefined) (grn as any).grn_date = dto.grn_date;
      if (dto.warehouse_id !== undefined) (grn as any).warehouse_id = dto.warehouse_id;
      if (dto.supplier_name !== undefined) (grn as any).supplier_name = dto.supplier_name?.trim() ?? null;
      if (dto.reference_no !== undefined) (grn as any).reference_no = dto.reference_no?.trim() ?? null;

      (grn as any).updated_by = actor;
      await manager.getRepository(InvGrn).save(grn);

      if (dto.items) {
        const seen = new Set<number>();
        for (const it of dto.items) {
          if (seen.has(it.line_no)) throw new BadRequestException(`Duplicate line_no: ${it.line_no}`);
          seen.add(it.line_no);
          if (it.qty_expected != null) ensurePositiveDec(`qty_expected (line ${it.line_no})`, it.qty_expected);
          if (it.unit_cost != null) ensureNonNegativeDec(`unit_cost (line ${it.line_no})`, it.unit_cost);
        }

        const repo = manager.getRepository(InvGrnItem);
        const existing = await repo.find({ where: { company_id, grn_id: id } as any });
        const byLine = new Map<number, any>(existing.map((x: any) => [Number(x.line_no), x]));

        for (const it of dto.items) {
          const row = byLine.get(Number(it.line_no));

          if (!row) {
            if (!it.sku_id) throw new BadRequestException(`sku_id required for new line ${it.line_no}`);
            const created = repo.create({
              company_id,
              grn_id: id,
              line_no: it.line_no,
              sku_id: it.sku_id,
              qty_expected: it.qty_expected ?? '0',
              qty_received_total: '0',
              unit_cost: it.unit_cost ?? null,
            } as any);
            await repo.save(created);
          } else {
            if (it.qty_expected !== undefined) {
              const received = Number(row.qty_received_total ?? 0);
              const nextExp = Number(it.qty_expected ?? 0);
              if (nextExp < received - 0.0000001) {
                throw new BadRequestException(`qty_expected cannot be < received_total (line ${it.line_no})`);
              }
              row.qty_expected = it.qty_expected;
            }
            if (it.sku_id !== undefined) row.sku_id = it.sku_id;
            if (it.unit_cost !== undefined) row.unit_cost = it.unit_cost;
            await repo.save(row);
          }
        }
      }

      return { id };
    });
  }

  async delete(auth: AuthUser, id: string, reason?: string) {
    const company_id = auth.company_id;
    const actor = this.common.actorId(auth);

    const grn = await this.grnRepo.findOne({ where: { id, company_id, deleted_at: null } as any });
    if (!grn) throw new NotFoundException('GRN not found');

    if (Number((grn as any).status) !== 1) throw new BadRequestException('Only DRAFT GRN can be deleted');

    await this.common.assertWarehouseAccessible(auth, String((grn as any).warehouse_id));

    (grn as any).deleted_at = new Date();
    (grn as any).deleted_by = actor;
    // (grn as any).delete_reason = reason ?? null;

    await this.grnRepo.save(grn);
    return { id };
  }

  async receive(auth: AuthUser, grnId: string, dto: ReceiveGrnDto) {
    if (!dto.lines?.length) throw new BadRequestException('lines is required');
    this.validateReceiveLines(dto.lines);

    return this.common.dataSource.transaction(async (manager) => {
      await this.receiveLinesTx(manager, auth, grnId, dto);
      return { id: grnId };
    });
  }

  async post(auth: AuthUser, grnId: string, dto: PostGrnDto) {
    return this.common.dataSource.transaction(async (manager) => {
      await this.postTx(manager, auth, grnId, dto);
      return { id: grnId };
    });
  }

  async reportItems(auth: AuthUser, q: ReportGrnItemsDto) {
    const company_id = auth.company_id;
    const { page, limit, skip } = this.common.normalizePage(q);

    const qb = this.grnItemRepo
      .createQueryBuilder('gi')
      .innerJoin(InvGrn, 'g', 'g.id = gi.grn_id AND g.deleted_at IS NULL')
      .leftJoin('md_sku', 's', 's.id = gi.sku_id')
      .where('gi.company_id=:cid', { cid: company_id })
      .andWhere('g.status = 2');

    if (!this.common.hasGlobalScope(auth) && (this.common.isDistUser(auth) || this.common.isSubDistUser(auth))) {
      const whIds = await this.common.listMyWarehouseIds(auth);
      qb.andWhere('g.warehouse_id IN (:...wids)', { wids: whIds.length ? whIds : ['-1'] });
    }

    if (q.from_date) qb.andWhere('g.grn_date >= :fd', { fd: q.from_date });
    if (q.to_date) qb.andWhere('g.grn_date <= :td', { td: q.to_date });
    if (q.warehouse_id) qb.andWhere('g.warehouse_id = :wid', { wid: q.warehouse_id });
    if (q.sku_id) qb.andWhere('gi.sku_id = :sid', { sid: q.sku_id });

    if (q.q?.trim()) {
      qb.andWhere(`(g.grn_no ILIKE :qq OR s.code ILIKE :qq OR s.name ILIKE :qq)`, { qq: `%${q.q.trim()}%` });
    }

    const totalRow = await qb.clone().select('COUNT(DISTINCT gi.sku_id)', 'cnt').getRawOne();
    const total = Number(totalRow?.cnt ?? 0);

    const rows = await qb
      .select([
        'gi.sku_id AS sku_id',
        's.code AS sku_code',
        's.name AS sku_name',
        'SUM(gi.qty_expected::numeric) AS qty_expected_sum',
        'SUM(gi.qty_received_total::numeric) AS qty_received_sum',
        `CASE WHEN SUM(gi.qty_received_total::numeric) = 0 THEN NULL
              ELSE SUM((gi.qty_received_total::numeric) * COALESCE(gi.unit_cost::numeric,0))
                   / SUM(gi.qty_received_total::numeric)
         END AS avg_unit_cost`,
        'SUM((gi.qty_received_total::numeric) * COALESCE(gi.unit_cost::numeric,0)) AS amount_received',
        'COUNT(DISTINCT g.id) AS grn_count',
        'MIN(g.grn_date) AS first_grn_date',
        'MAX(g.grn_date) AS last_grn_date',
      ])
      .groupBy('gi.sku_id')
      .addGroupBy('s.code')
      .addGroupBy('s.name')
      .orderBy('s.name', 'ASC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, pages: Math.ceil(total / limit), rows };
  }

  // -------------------------
  // internal Tx helpers
  // -------------------------
  private validateReceiveLines(lines: ReceiveGrnLineDto[]) {
    const seen = new Set<number>();
    for (const ln of lines) {
      if (seen.has(ln.line_no)) throw new BadRequestException(`Duplicate line_no: ${ln.line_no}`);
      seen.add(ln.line_no);
      ensurePositiveDec(`qty_receive (line ${ln.line_no})`, ln.qty_receive);
      if (ln.unit_cost != null) ensureNonNegativeDec(`unit_cost (line ${ln.line_no})`, ln.unit_cost);
    }
  }

  private async receiveLinesTx(
    manager: any,
    auth: AuthUser,
    grnId: string,
    dto: { received_at?: string; lines: ReceiveGrnLineDto[]; remarks?: string },
  ) {
    const company_id = auth.company_id;

    const grn = await manager.getRepository(InvGrn).findOne({
      where: { id: grnId, company_id, deleted_at: null } as any,
    });
    if (!grn) throw new NotFoundException('GRN not found');
    if (Number((grn as any).status) !== 1) throw new BadRequestException('Only DRAFT GRN can be received');

    const warehouse_id = String((grn as any).warehouse_id);
    await this.common.assertWarehouseAccessible(auth, warehouse_id);

    const receivedAt = parseDateOrThrow('received_at', dto.received_at);

    const itemRepo = manager.getRepository(InvGrnItem);
    const items = await itemRepo.find({ where: { company_id, grn_id: grnId } as any });
    const byLine = new Map<number, any>(items.map((x: any) => [Number(x.line_no), x]));

    const txnRepo = manager.getRepository(InvTxn);
    const lotRepo = manager.getRepository(InvLot);
    const txnLotRepo = manager.getRepository(InvTxnLot);

    for (const ln of dto.lines) {
      const row = byLine.get(Number(ln.line_no));
      if (!row) throw new BadRequestException(`GRN line not found: ${ln.line_no}`);

      const expected = Number(row.qty_expected ?? 0);
      const received = Number(row.qty_received_total ?? 0);
      const add = Number(ln.qty_receive);

      if (received + add > expected + 0.0000001) throw new BadRequestException(`Receiving exceeds expected (line ${ln.line_no})`);

      const unitCost = ln.unit_cost ?? row.unit_cost ?? null;

      const txn = txnRepo.create({
        company_id,
        txn_time: receivedAt,
        txn_type: InvTxnType.GRN_IN,
        warehouse_id,
        sku_id: String(row.sku_id),
        qty_in: String(add),
        qty_out: '0',
        ref_doc_type: RefDocType.GRN,
        ref_doc_id: grnId,
        remarks: dto.remarks ?? null,
        created_by: this.common.actorId(auth),
      } as any);
      const savedTxn = await txnRepo.save(txn);

      const lot = lotRepo.create({
        company_id,
        warehouse_id,
        sku_id: String(row.sku_id),
        source_doc_type: InvLotSourceDocType.GRN,
        source_doc_id: grnId,
        received_at: receivedAt,
        batch_no: ln.batch_no ?? null,
        expiry_date: ln.expiry_date ?? null,
        unit_cost: unitCost,
        qty_received: String(add),
        qty_available: String(add),
      } as any);
      const savedLot = await lotRepo.save(lot);

      await txnLotRepo.save(
        txnLotRepo.create({
          company_id,
          inv_txn_id: String((savedTxn as any).id),
          lot_id: String((savedLot as any).id),
          qty: String(add),
        } as any),
      );

      row.qty_received_total = String(received + add);
      await itemRepo.save(row);

      await this.common.applyBalanceDelta(manager, {
        company_id,
        warehouse_id,
        sku_id: String(row.sku_id),
        delta_on_hand: String(add),
        delta_reserved: '0',
      });
    }
  }

  private async postTx(manager: any, auth: AuthUser, grnId: string, dto: PostGrnDto) {
    const company_id = auth.company_id;

    const grn = await manager.getRepository(InvGrn).findOne({
      where: { id: grnId, company_id, deleted_at: null } as any,
    });
    if (!grn) throw new NotFoundException('GRN not found');

    await this.common.assertWarehouseAccessible(auth, String((grn as any).warehouse_id));
    if (Number((grn as any).status) !== 1) throw new BadRequestException('Only DRAFT GRN can be posted');

    const items = await manager.getRepository(InvGrnItem).find({ where: { company_id, grn_id: grnId } as any });
    if (!items.length) throw new BadRequestException('GRN has no items');

    for (const it of items as any[]) {
      const exp = Number(it.qty_expected ?? 0);
      const rec = Number(it.qty_received_total ?? 0);
      if (rec + 0.0000001 < exp) throw new BadRequestException('Cannot post: GRN not fully received');
    }

    (grn as any).status = 2;
    (grn as any).updated_by = this.common.actorId(auth);
    (grn as any).updated_at = new Date();

    await manager.getRepository(InvGrn).save(grn);
  }
}
