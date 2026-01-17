import { MigrationInterface, QueryRunner } from 'typeorm';

export class SoOrderAddScopeAndWorkflowColumns1737120000000 implements MigrationInterface {
  name = 'SoOrderAddScopeAndWorkflowColumns1737120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- columns ---
    await queryRunner.query(`
  ALTER TABLE so_order
    ADD COLUMN IF NOT EXISTS org_node_id bigint NULL,
    ADD COLUMN IF NOT EXISTS outlet_type smallint NULL,
    ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS submitted_by_user_id bigint NULL,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS approved_by_user_id bigint NULL,
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS rejected_by_user_id bigint NULL,
    ADD COLUMN IF NOT EXISTS reject_reason text NULL;
`);

await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS so_order_no_seq;`);


    // --- indexes ---
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_so_order_org
      ON so_order(company_id, org_node_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_so_order_outlet
      ON so_order(company_id, outlet_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_so_order_dist
      ON so_order(company_id, distributor_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_so_order_date
      ON so_order(company_id, order_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS ix_so_order_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_so_order_dist;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_so_order_outlet;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_so_order_org;`);

    // columns (drop one by one for safety)
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS reject_reason;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS rejected_by_user_id;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS rejected_at;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS approved_by_user_id;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS approved_at;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS submitted_by_user_id;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS submitted_at;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS outlet_type;`);
    await queryRunner.query(`ALTER TABLE so_order DROP COLUMN IF EXISTS org_node_id;`);
  }
}
