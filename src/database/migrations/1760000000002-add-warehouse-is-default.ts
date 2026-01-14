// src/migrations/1760000000002-add-warehouse-is-default.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWarehouseIsDefault1760000000002 implements MigrationInterface {
  name = 'AddWarehouseIsDefault1760000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "md_warehouse"
      ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false
    `);

    // optional index to speed up default lookup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_md_warehouse_default_owner"
      ON "md_warehouse" ("company_id", "owner_type", "owner_id", "is_default")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_md_warehouse_default_owner"
    `);

    await queryRunner.query(`
      ALTER TABLE "md_warehouse"
      DROP COLUMN IF EXISTS "is_default"
    `);
  }
}
