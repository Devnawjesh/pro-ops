// src/modules/pricing/entities/price-list-scope.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { PriceList } from './price-list.entity';

// use your actual entities if you have them
import { MdDistributor } from '../../distributors/entities/distributor.entity';
// Org node table name differs in projects; keep nullable + optional relation
// import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity';

@Entity({ name: 'md_price_list_scope' })
@Index(
  ['company_id', 'price_list_id', 'distributor_id', 'outlet_type', 'org_node_id', 'effective_from'],
  { unique: true },
)
@Index(['company_id', 'distributor_id'])
@Index(['company_id', 'org_node_id'])
export class PriceListScope extends BaseMasterEntity {
  @Column({ type: 'bigint' })
  price_list_id!: string;

  // Optional scope filters (NULL = applies to all)
  @Column({ type: 'bigint', nullable: true })
  distributor_id?: string | null;

  @Column({ type: 'smallint', nullable: true })
  outlet_type?: number | null;

  @Column({ type: 'bigint', nullable: true })
  org_node_id?: string | null; // territory/area/route etc

  @ManyToOne(() => PriceList, (pl) => pl.scopes, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_list_id' })
  price_list!: PriceList;

  @ManyToOne(() => MdDistributor, { nullable: true })
  @JoinColumn({ name: 'distributor_id' })
  distributor?: MdDistributor | null;
}
