import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BigIntTransformer } from '../../../common/transformers/bigint.transformer';
import { Status, UserType } from '../../../common/constants/enums';
import { Company } from '../../org/entities/company.entity';
import { UserRole } from './user-role.entity';
import { UserScope } from './user-scope.entity';

@Entity({ name: 'md_user' })
@Index(['company_id', 'username'], { unique: true })
@Index(['company_id', 'user_code'], { unique: true })
@Index(['company_id', 'mobile'], { unique: true })
export class User {
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

  @Column({ type: 'text' })
  user_code!: string;

  @Column({ type: 'text' })
  full_name!: string;

  @Column({ type: 'text' })
  mobile!: string;

  @Column({ type: 'text', nullable: true })
  email?: string | null;

  @Column({ type: 'text' })
  username!: string;

  @Column({ type: 'text', nullable: true, select: false })
  password_hash?: string | null;

  @Column({ type: 'smallint' })
  user_type!: UserType;

  @Column({ type: 'bigint', nullable: true, transformer: BigIntTransformer })
  reporting_manager_id?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reporting_manager_id' })
  reporting_manager?: User | null;

  @Column({ type: 'text', nullable: true, select: false })
  refresh_token_hash?: string | null;

  @Column({ type: 'smallint', default: Status.ACTIVE })
  status!: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @OneToMany(() => UserRole, (ur) => ur.user)
  roles!: UserRole[];

  @OneToMany(() => UserScope, (us) => us.user)
  scopes!: UserScope[];
}
