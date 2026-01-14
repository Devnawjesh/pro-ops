import { Entity, Column, Index } from 'typeorm';

@Entity({ name: 'md_role' })
@Index(['code'], { unique: true })
export class Role {
  @Column({ type: 'bigint', primary: true, generated: 'increment' })
  id!: string;

  @Column({ type: 'text' })
  code!: string; // SALES_HEAD, RSM, ...

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'smallint', default: 1 })
  status!: number;
}