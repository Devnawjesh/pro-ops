// src/modules/pricing/entities/price-list.entity.ts
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { PriceListItem } from './price-list-item.entity';
import { PriceListScope } from './price-list-scope.entity';

export enum PriceListType {
  DEFAULT = 1,
  DISTRIBUTOR = 2,
  CHANNEL = 3,
  TERRITORY = 4,
}

@Entity({ name: 'md_price_list' })
@Index(['company_id', 'code'], { unique: true })
@Index(['company_id', 'price_list_type'])
export class PriceList extends BaseMasterEntity {
  @Column({ type: 'smallint' })
  price_list_type!: PriceListType;

  // Optional: for UI description
  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @OneToMany(() => PriceListItem, (x) => x.price_list)
  items!: PriceListItem[];

  @OneToMany(() => PriceListScope, (x) => x.price_list)
  scopes!: PriceListScope[];
}
