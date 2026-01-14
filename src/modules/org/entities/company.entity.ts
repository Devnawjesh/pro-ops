import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { OrgHierarchy } from './org-hierarchy.entity';
import { Route } from './route.entity';

@Entity({ name: 'md_company' })
@Index(['company_id', 'code'], { unique: true })
export class Company extends BaseMasterEntity {
  @Column({ type: 'text', nullable: true })
  legal_name?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @OneToMany(() => OrgHierarchy, (x) => x.company)
  org_nodes!: OrgHierarchy[];

  @OneToMany(() => Route, (x) => x.company)
  routes!: Route[];
}