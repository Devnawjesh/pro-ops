import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ArInvoice } from './entities/ar_invoice.entity';
import { ArInvoiceItem } from './entities/ar_invoice_item.entity';
import { ListArInvoiceDto } from './dto/list-ar-invoice.dto';
import { ScopeType, UserType } from '../../common/constants/enums';

type AuthUser = {
  company_id: string;
  user_type: number;
  distributor_id?: string | null;
  scopes?: Array<{ scope_type?: number; distributor_id?: string | null }>;
};

@Injectable()
export class ArService {
  constructor(
    @InjectRepository(ArInvoice) private readonly arRepo: Repository<ArInvoice>,
    @InjectRepository(ArInvoiceItem) private readonly arItemRepo: Repository<ArInvoiceItem>,
  ) {}

  private normalizePage(q: { page?: number; limit?: number }) {
    const page = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 20;
    const skip = (safePage - 1) * safeLimit;
    return { page: safePage, limit: safeLimit, skip };
  }

  private getDistributorId(auth: AuthUser) {
    const direct = auth.distributor_id != null ? String(auth.distributor_id).trim() : '';
    if (direct) return direct;

    const scoped = (auth.scopes ?? [])
      .filter((s) => Number(s.scope_type) === ScopeType.DISTRIBUTOR)
      .map((s) => (s?.distributor_id != null ? String(s.distributor_id).trim() : ''))
      .find((x) => x);

    return scoped ?? '';
  }

  private assertReadable(auth: AuthUser, invoice: ArInvoice) {
    if (Number(auth.user_type) === UserType.EMPLOYEE) return;

    if (
      Number(auth.user_type) === UserType.DISTRIBUTOR_USER ||
      Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER
    ) {
      const myDist = this.getDistributorId(auth);
      if (!myDist || String(invoice.distributor_id) !== myDist) {
        throw new ForbiddenException('No access to this invoice');
      }
      return;
    }

    throw new ForbiddenException('No access to invoices');
  }

  async list(auth: AuthUser, q: ListArInvoiceDto) {
    const company_id = auth.company_id;
    const { page, limit, skip } = this.normalizePage(q);

    const qb = this.arRepo
      .createQueryBuilder('i')
      .leftJoin('md_distributor', 'd', 'd.id=i.distributor_id AND d.company_id=i.company_id AND d.deleted_at IS NULL')
      .leftJoin('md_warehouse', 'w', 'w.id=i.warehouse_id AND w.company_id=i.company_id AND w.deleted_at IS NULL')
      .where('i.company_id=:cid', { cid: company_id });

    if (
      Number(auth.user_type) === UserType.DISTRIBUTOR_USER ||
      Number(auth.user_type) === UserType.SUB_DISTRIBUTOR_USER
    ) {
      const myDist = this.getDistributorId(auth);
      if (!myDist) {
        return { page, limit, total: 0, pages: 0, rows: [] };
      }
      qb.andWhere('i.distributor_id=:did', { did: myDist });
    }

    if (q.distributor_id) qb.andWhere('i.distributor_id=:did', { did: q.distributor_id });
    if (q.from_date) qb.andWhere('i.invoice_date >= :fd', { fd: q.from_date });
    if (q.to_date) qb.andWhere('i.invoice_date <= :td', { td: q.to_date });
    if (q.q?.trim()) qb.andWhere('i.invoice_no ILIKE :qq', { qq: `%${q.q.trim()}%` });

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'i.id AS id',
        'i.invoice_no AS invoice_no',
        'i.invoice_date AS invoice_date',
        'i.status AS status',
        'i.distributor_id AS distributor_id',
        'i.warehouse_id AS warehouse_id',
        'i.gross_amount AS gross_amount',
        'i.discount_amount AS discount_amount',
        'i.net_amount AS net_amount',
        'i.ref_doc_type AS ref_doc_type',
        'i.ref_doc_id AS ref_doc_id',
        'i.ref_doc_no AS ref_doc_no',
        'i.created_at AS created_at',

        'd.code AS distributor_code',
        'd.name AS distributor_name',
        'w.code AS warehouse_code',
        'w.name AS warehouse_name',
      ])
      .orderBy('i.id', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawMany();

    return { page, limit, total, pages: Math.ceil(total / limit), rows };
  }

  async get(auth: AuthUser, id: string) {
    const invoice = await this.arRepo.findOne({ where: { id, company_id: auth.company_id } as any });
    if (!invoice) throw new NotFoundException('Invoice not found');

    this.assertReadable(auth, invoice);

    const header = await this.arRepo
      .createQueryBuilder('i')
      .leftJoin('md_distributor', 'd', 'd.id=i.distributor_id AND d.company_id=i.company_id AND d.deleted_at IS NULL')
      .leftJoin('md_warehouse', 'w', 'w.id=i.warehouse_id AND w.company_id=i.company_id AND w.deleted_at IS NULL')
      .where('i.company_id=:cid', { cid: auth.company_id })
      .andWhere('i.id=:id', { id })
      .select([
        'i.id AS id',
        'i.invoice_no AS invoice_no',
        'i.invoice_date AS invoice_date',
        'i.status AS status',
        'i.distributor_id AS distributor_id',
        'i.warehouse_id AS warehouse_id',
        'i.gross_amount AS gross_amount',
        'i.discount_amount AS discount_amount',
        'i.net_amount AS net_amount',
        'i.ref_doc_type AS ref_doc_type',
        'i.ref_doc_id AS ref_doc_id',
        'i.ref_doc_no AS ref_doc_no',
        'i.created_at AS created_at',
        'i.updated_at AS updated_at',

        'd.code AS distributor_code',
        'd.name AS distributor_name',
        'w.code AS warehouse_code',
        'w.name AS warehouse_name',
      ])
      .getRawOne();

    if (!header) throw new BadRequestException('Invoice not found');

    const items = await this.arItemRepo
      .createQueryBuilder('it')
      .leftJoin('md_sku', 's', 's.id=it.sku_id AND s.company_id=it.company_id AND s.deleted_at IS NULL')
      .where('it.company_id=:cid', { cid: auth.company_id })
      .andWhere('it.invoice_id=:iid', { iid: id })
      .select([
        'it.line_no AS line_no',
        'it.sku_id AS sku_id',
        's.code AS sku_code',
        's.name AS sku_name',
        'it.qty AS qty',
        'it.unit_price AS unit_price',
        'it.line_discount AS line_discount',
        'it.line_total AS line_total',
      ])
      .orderBy('it.line_no', 'ASC')
      .getRawMany();

    return { invoice: header, items };
  }
}
