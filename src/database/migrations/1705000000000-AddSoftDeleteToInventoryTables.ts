import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToInventoryTables1705000000000 implements MigrationInterface {
  name = 'AddSoftDeleteToInventoryTables1705000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE inv_grn ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE inv_grn ADD COLUMN IF NOT EXISTS deleted_by bigint NULL`);

    await queryRunner.query(`ALTER TABLE inv_transfer ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE inv_transfer ADD COLUMN IF NOT EXISTS deleted_by bigint NULL`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ix_inv_grn_company_deleted ON inv_grn(company_id, deleted_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS ix_inv_transfer_company_deleted ON inv_transfer(company_id, deleted_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ix_inv_transfer_company_deleted`);
    await queryRunner.query(`DROP INDEX IF EXISTS ix_inv_grn_company_deleted`);

    await queryRunner.query(`ALTER TABLE inv_transfer DROP COLUMN IF EXISTS deleted_by`);
    await queryRunner.query(`ALTER TABLE inv_transfer DROP COLUMN IF EXISTS deleted_at`);

    await queryRunner.query(`ALTER TABLE inv_grn DROP COLUMN IF EXISTS deleted_by`);
    await queryRunner.query(`ALTER TABLE inv_grn DROP COLUMN IF EXISTS deleted_at`);
  }
}
