import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity({ name: 'md_role_permission' })
@Index(['role_id', 'permission_id'], { unique: true })
export class RolePermission {
  @Column({ type: 'bigint', primary: true, generated: 'increment' })
  id!: string;

  @Column({ type: 'bigint' })
  role_id!: string;

  @Column({ type: 'bigint' })
  permission_id!: string;

  @ManyToOne(() => Role, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @ManyToOne(() => Permission, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: Permission;
}
