import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { OrgLevel } from '../../../common/constants/enums';
import { Company } from './company.entity';
import { Route } from './route.entity';

@Entity({ name: 'md_org_hierarchy' })
@Index(['company_id', 'code'], { unique: true })
@Index(['company_id', 'level_no'])
@Index(['parent_id'])
export class OrgHierarchy extends BaseMasterEntity {
  @Column({ type: 'smallint' })
  level_no!: OrgLevel;

  @Column({ type: 'bigint', nullable: true })
  parent_id?: string | null;

  @ManyToOne(() => OrgHierarchy, (x) => x.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: OrgHierarchy | null;

  @OneToMany(() => OrgHierarchy, (x) => x.parent)
  children!: OrgHierarchy[];

  @Column({ type: 'text', nullable: true })
  path?: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;

  @ManyToOne(() => Company, (c) => c.org_nodes, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToMany(() => Route, (r) => r.territory)
  routes!: Route[];
}