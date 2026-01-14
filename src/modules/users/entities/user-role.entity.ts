import { Entity, Column, Index, ManyToOne, JoinColumn,PrimaryGeneratedColumn } from 'typeorm';
import { BigIntTransformer } from '../../../common/transformers/bigint.transformer';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity({ name: 'md_user_role' })
@Index(['user_id', 'role_id'], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  user_id!: string;

  @Column({ type: 'bigint', transformer: BigIntTransformer })
  role_id!: string;

  @ManyToOne(() => User, (u) => u.roles, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Role, { nullable: false })
  @JoinColumn({ name: 'role_id' })
  role!: Role;
}