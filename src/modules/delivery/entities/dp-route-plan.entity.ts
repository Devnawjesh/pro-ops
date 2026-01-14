// src/modules/delivery/entities/dp-route-plan.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity';
import { DpRoutePlanOutlet } from './dp-route-plan-outlet.entity';

@Entity({ name: 'dp_route_plan' })
@Index(['company_id', 'org_route_node_id', 'plan_month'], { unique: true })
@Index(['company_id', 'plan_month'])
export class DpRoutePlan extends BaseMasterEntity {
  // Route/Beat node (your org hierarchy node for Route)
  @Column({ type: 'bigint' })
  org_route_node_id!: string;

  // Use first day of month as canonical month key (2026-01-01)
  @Column({ type: 'date' })
  plan_month!: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string | null;

  @ManyToOne(() => OrgHierarchy, { nullable: false })
  @JoinColumn({ name: 'org_route_node_id' })
  route_node!: OrgHierarchy;

  @OneToMany(() => DpRoutePlanOutlet, (x) => x.route_plan)
  outlets!: DpRoutePlanOutlet[];
}
