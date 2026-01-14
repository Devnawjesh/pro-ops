import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseSoftDeleteEntity {
  // If you already have id/company_id in your BaseMasterEntity, use that instead.
  // Otherwise keep only soft delete + audit fields here.

  @CreateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;

  @Column('bigint')
  created_by_user_id!: string;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at?: Date | null;

  @Column({ type: 'bigint', nullable: true })
  deleted_by?: string | null;
}
