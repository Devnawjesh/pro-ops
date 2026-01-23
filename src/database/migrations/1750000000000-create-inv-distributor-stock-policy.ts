// src/migrations/1730000000000-create-inv-distributor-stock-policy.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvDistributorStockPolicy1750000000000 implements MigrationInterface {
  name = 'CreateInvDistributorStockPolicy1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inv_distributor_stock_policy" (
        "id" BIGSERIAL PRIMARY KEY,
        "company_id" BIGINT NOT NULL,
        "distributor_id" BIGINT NOT NULL,
        "sku_id" BIGINT NOT NULL,
        "min_qty" NUMERIC NULL,
        "max_qty" NUMERIC NULL,
        "status" VARCHAR(16) NOT NULL DEFAULT 'active',
        "created_by" BIGINT NULL,
        "updated_by" BIGINT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
    `);

    // Unique (soft-delete aware): unique where deleted_at is null
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_inv_dist_stock_policy_company_dist_sku"
      ON "inv_distributor_stock_policy" ("company_id", "distributor_id", "sku_id")
      WHERE "deleted_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_inv_dist_stock_policy_company_dist"
      ON "inv_distributor_stock_policy" ("company_id", "distributor_id")
      WHERE "deleted_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_inv_dist_stock_policy_company_sku"
      ON "inv_distributor_stock_policy" ("company_id", "sku_id")
      WHERE "deleted_at" IS NULL;
    `);

    // Optional: keep updated_at fresh if you rely on DB-side updates (otherwise app handles it)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_inv_dist_stock_policy_updated_at ON "inv_distributor_stock_policy";
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_inv_dist_stock_policy_updated_at
      BEFORE UPDATE ON "inv_distributor_stock_policy"
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_inv_dist_stock_policy_updated_at ON "inv_distributor_stock_policy";`);
    // NOTE: function may be shared; only drop if you’re sure it’s not used elsewhere.
    // await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at_column();`);

    await queryRunner.query(`DROP INDEX IF EXISTS "ix_inv_dist_stock_policy_company_sku";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_inv_dist_stock_policy_company_dist";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ux_inv_dist_stock_policy_company_dist_sku";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inv_distributor_stock_policy";`);
  }
}
