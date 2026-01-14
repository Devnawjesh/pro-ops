// src/modules/master/entities/md_distributor.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';

@Entity({ name: 'md_distributor' })
@Index('uq_md_distributor_company_code', ['company_id', 'code'], { unique: true })
@Index('ix_md_distributor_company_type', ['company_id', 'distributor_type'])
@Index('ix_md_distributor_company_parent', ['company_id', 'parent_distributor_id'])
export class MdDistributor extends BaseMasterEntity {
  @Column({ type: 'smallint' })
  distributor_type: number; // DistributorType

  @Column({ type: 'bigint', nullable: true })
  parent_distributor_id: string | null;

  @Column({ type: 'text', nullable: true })
  trade_name: string | null;

  @Column({ type: 'text', nullable: true })
  owner_name: string | null;

  @Column({ type: 'text', nullable: true })
  mobile: string | null;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  credit_limit: string;

  @Column({ type: 'int', default: 0 })
  payment_terms_days: number;

  @Column({ type: 'text', nullable: true })
  vat_registration_no: string | null;

  @Column({ type: 'text', nullable: true })
  tin_no: string | null;

  @Column({ type: 'text', nullable: true })
  erp_partner_id: string | null;
}
