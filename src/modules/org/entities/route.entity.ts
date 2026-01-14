import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { OrgHierarchy } from './org-hierarchy.entity';
import { Company } from './company.entity';

@Entity({ name: 'md_route' })
@Index(['company_id', 'code'], { unique: true })
@Index(['territory_id'])
export class Route extends BaseMasterEntity {
  @Column({ type: 'bigint' })
  territory_id!: string;

  @ManyToOne(() => OrgHierarchy, (t) => t.routes, { nullable: false })
  @JoinColumn({ name: 'territory_id' })
  territory!: OrgHierarchy;

  @Column({ type: 'smallint', nullable: true })
  default_delivery_day?: number | null; // 0-6

  @Column({ type: 'boolean', default: true })
  is_delivery_route!: boolean;

  @ManyToOne(() => Company, (c) => c.routes, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company!: Company;
}
