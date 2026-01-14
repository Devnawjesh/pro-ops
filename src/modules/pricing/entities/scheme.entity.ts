// src/modules/pricing/entities/scheme.entity.ts
import { Entity, Column, Index, OneToMany, JoinColumn, ManyToOne } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { SchemeType } from '../../../common/constants/enums';
import { SchemeRule } from './scheme-rule.entity';
import { MdDistributor } from '../../distributors/entities/distributor.entity';
import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity';

@Entity({ name: 'md_scheme' })
@Index(['company_id', 'code'], { unique: true })
@Index(['company_id', 'scheme_type'])
@Index(['company_id', 'distributor_id'])
@Index(['company_id', 'org_node_id'])
export class Scheme extends BaseMasterEntity {
  @Column({ type: 'smallint' })
  scheme_type!: SchemeType;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'boolean', default: false })
  can_stack!: boolean;

  // Scope filters (nullable means "applies to all")
  @Column({ type: 'bigint', nullable: true })
  distributor_id?: string | null;

  @Column({ type: 'smallint', nullable: true })
  outlet_type?: number | null;

  @Column({ type: 'bigint', nullable: true })
  org_node_id?: string | null;

  // Optional relations (safe if tables exist)
  @ManyToOne(() => MdDistributor, { nullable: true })
  @JoinColumn({ name: 'distributor_id' })
  distributor?: MdDistributor | null;

  @ManyToOne(() => OrgHierarchy, { nullable: true })
  @JoinColumn({ name: 'org_node_id' })
  org_node?: OrgHierarchy | null;

  @OneToMany(() => SchemeRule, (r) => r.scheme)
  rules!: SchemeRule[];
}
