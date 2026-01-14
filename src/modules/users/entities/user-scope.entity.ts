import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BigIntTransformer } from '../../../common/transformers/bigint.transformer';
import { ScopeType } from '../../../common/constants/enums';
import { User } from './user.entity';
import { OrgHierarchy } from '../../org/entities/org-hierarchy.entity';
import { Route } from '../../org/entities/route.entity';
import { MdDistributor } from '../../distributors/entities/distributor.entity';

@Entity({ name: 'md_user_scope' })
@Index(
  ['company_id', 'user_id', 'scope_type', 'org_node_id', 'route_id', 'distributor_id'],
  { unique: true },
)
export class UserScope {
  @Column({
    type: 'bigint',
    primary: true,
    generated: 'increment',
    transformer: BigIntTransformer,
  })
  id!: string;

  @Index()
  @Column({ type: 'bigint', transformer: BigIntTransformer })
  company_id!: string;

  @Index()
  @Column({ type: 'bigint', transformer: BigIntTransformer })
  user_id!: string;

  @Column({ type: 'smallint' })
  scope_type!: ScopeType;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  org_node_id?: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  route_id?: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  distributor_id?: string | null;

  @ManyToOne(() => User, (u) => u.scopes, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => OrgHierarchy, { nullable: true })
  @JoinColumn({ name: 'org_node_id' })
  org_node?: OrgHierarchy | null;

  @ManyToOne(() => Route, { nullable: true })
  @JoinColumn({ name: 'route_id' })
  route?: Route | null;

  @ManyToOne(() => MdDistributor, { nullable: true })
  @JoinColumn({ name: 'distributor_id' })
  distributor?: MdDistributor | null;
}