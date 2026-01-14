// src/modules/master/entities/md_warehouse.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';

@Entity({ name: 'md_warehouse' })
@Index('uq_md_warehouse_company_code', ['company_id', 'code'], { unique: true })
@Index('ix_md_warehouse_owner', ['company_id', 'owner_type', 'owner_id'])
export class MdWarehouse extends BaseMasterEntity {

  @Column({ type: 'smallint' })
  owner_type: number; // WarehouseOwnerType

  @Column({ type: 'bigint', nullable: true })
  owner_id: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  lat: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 7, nullable: true })
  lng: string | null;

  @Column({ type: 'boolean', default: false })
  is_batch_tracked: boolean;

  @Column({ type: 'boolean', default: false })
  is_expiry_tracked: boolean;
  @Column({ type: 'boolean', default: false })
  is_default!: boolean;
}
