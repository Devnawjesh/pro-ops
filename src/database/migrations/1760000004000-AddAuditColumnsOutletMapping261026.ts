import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditColumnsOutletMapping1760000004000 implements MigrationInterface {
  name = 'AddAuditColumnsOutletMapping1760000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE md_outlet_org
        ADD COLUMN IF NOT EXISTS created_by bigint NULL,
        ADD COLUMN IF NOT EXISTS updated_by bigint NULL,
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS deleted_by bigint NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE md_outlet_distributor
        ADD COLUMN IF NOT EXISTS created_by bigint NULL,
        ADD COLUMN IF NOT EXISTS updated_by bigint NULL,
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS deleted_by bigint NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: drop columns if they exist
    await queryRunner.query(`
      ALTER TABLE md_outlet_org
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS updated_by,
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS deleted_by;
    `);

    await queryRunner.query(`
      ALTER TABLE md_outlet_distributor
        DROP COLUMN IF EXISTS created_by,
        DROP COLUMN IF EXISTS updated_by,
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS deleted_by;
    `);
  }
}
