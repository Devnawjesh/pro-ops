// src/modules/master/distributor/entities/md_distributor_org_node.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BigIntTransformer } from 'src/common/transformers/bigint.transformer';
import { MdDistributor } from './distributor.entity';
import { OrgHierarchy } from 'src/modules/org/entities/org-hierarchy.entity';

@Entity({ name: 'md_distributor_org_node' })
@Index(['company_id', 'distributor_id', 'org_node_id'], { unique: true })
@Index(['company_id', 'org_node_id'])
@Index(['company_id', 'distributor_id'])
export class MdDistributorOrgNode {
  @Column({ type: 'bigint', primary: true, generated: 'increment', transformer: BigIntTransformer })
  id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  company_id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  distributor_id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  org_node_id!: string; // usually TERRITORY node id

  @ManyToOne(() => MdDistributor, { nullable: false })
  @JoinColumn({ name: 'distributor_id' })
  distributor!: MdDistributor;

  @ManyToOne(() => OrgHierarchy, { nullable: false })
  @JoinColumn({ name: 'org_node_id' })
  org_node!: OrgHierarchy;
}
