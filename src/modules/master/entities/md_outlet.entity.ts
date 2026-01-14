// src/modules/master/entities/md_outlet.entity.ts
import { Entity, Column, Index } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';

@Entity({ name: 'md_outlet' })
@Index('uq_md_outlet_company_code', ['company_id', 'code'], { unique: true })
@Index('ix_md_outlet_type', ['company_id', 'outlet_type'])
export class MdOutlet extends BaseMasterEntity {
  @Column({ type: 'smallint' })
  outlet_type!: number; // define enum later if needed

  @Column({ type: 'text', nullable: true })
  owner_name!: string | null;

  @Column({ type: 'text', nullable: true })
  mobile!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  lat!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  lng!: string | null;
}