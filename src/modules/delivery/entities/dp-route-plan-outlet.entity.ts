// src/modules/delivery/entities/dp-route-plan-outlet.entity.ts
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseMasterEntity } from '../../../common/entities/base-master.entity';
import { DpRoutePlan } from './dp-route-plan.entity';
import { MdOutlet } from '../../master/entities/md_outlet.entity';

export enum VisitFrequency {
  WEEKLY = 1,
  FORTNIGHTLY = 2,
  MONTHLY = 3,
}

@Entity({ name: 'dp_route_plan_outlet' })
@Index(['company_id', 'route_plan_id', 'outlet_id'], { unique: true })
@Index(['company_id', 'outlet_id'])
export class DpRoutePlanOutlet extends BaseMasterEntity {
  @Column({ type: 'bigint' })
  route_plan_id!: string;

  @Column({ type: 'bigint' })
  outlet_id!: string;

  // Optional: Which day of week the outlet is planned (1=Mon ... 7=Sun)
  @Column({ type: 'smallint', nullable: true })
  weekday?: number | null;

  // Stop sequence in that day (for routing)
  @Column({ type: 'int', default: 0 })
  stop_seq!: number;

  // Weekly / Fortnightly / Monthly
  @Column({ type: 'smallint', default: VisitFrequency.WEEKLY })
  frequency!: number;

  @ManyToOne(() => DpRoutePlan, (p) => p.outlets, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_plan_id' })
  route_plan!: DpRoutePlan;

  @ManyToOne(() => MdOutlet, { nullable: false })
  @JoinColumn({ name: 'outlet_id' })
  outlet!: MdOutlet;
}
