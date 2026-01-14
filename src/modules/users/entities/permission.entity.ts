import { Entity, Column, Index } from 'typeorm';
import { Status } from '../../../common/constants/enums';

@Entity({ name: 'md_permission' })
@Index(['code'], { unique: true })
export class Permission {
  @Column({ type: 'bigint', primary: true, generated: 'increment' })
  id!: string;

  /**
   * Example: "users:view", "orders:create", "inventory:manage"
   */
  @Column({ type: 'text' })
  code!: string;

  @Index()
  @Column({ type: 'text' })
  module!: string; // users, org, orders, inventory ...

  @Index()
  @Column({ type: 'text' })
  action!: string; // view/create/update/delete/manage

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'smallint', default: Status.ACTIVE })
  status!: number;
}
