// src/modules/pricing/entities/price-list-item.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { PriceList } from './price-list.entity';
import { MdSku } from '../../master/entities/md_sku.entity';

@Entity({ name: 'md_price_list_item' })
@Index(['company_id', 'price_list_id', 'sku_id', 'effective_from'], { unique: true })
@Index(['company_id', 'sku_id'])
export class PriceListItem extends BaseMasterEntity {
  @Column({ type: 'bigint' })
  price_list_id!: string;

  @Column({ type: 'bigint' })
  sku_id!: string;

  // prices
  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  mrp?: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  tp?: string | null;

  @Column({ type: 'numeric', precision: 18, scale: 2, nullable: true })
  dp?: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  vat_rate!: string;

  @ManyToOne(() => PriceList, (pl) => pl.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  price_list!: PriceList;

  @ManyToOne(() => MdSku, { nullable: false })
  @JoinColumn({ name: 'sku_id' })
  sku!: MdSku;
}
