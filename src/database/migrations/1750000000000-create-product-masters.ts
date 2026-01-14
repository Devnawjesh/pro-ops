import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateProductMasters1750000000000 implements MigrationInterface {
  name = 'CreateProductMasters1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -----------------------------
    // md_brand
    // -----------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_brand',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'code', type: 'text' },
          { name: 'name', type: 'text' },
          { name: 'description', type: 'text', isNullable: true },

          { name: 'status', type: 'smallint', default: '1' },
          { name: 'effective_from', type: 'date', isNullable: true },
          { name: 'effective_to', type: 'date', isNullable: true },
          { name: 'inactivated_at', type: 'timestamptz', isNullable: true },
          { name: 'inactivation_reason', type: 'text', isNullable: true },

          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'created_by', type: 'bigint', isNullable: true },
          { name: 'updated_by', type: 'bigint', isNullable: true },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
          { name: 'deleted_by', type: 'bigint', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'md_brand',
      new TableIndex({
        name: 'uq_md_brand_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
    );

    // -----------------------------
    // md_category
    // -----------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_category',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'code', type: 'text' },
          { name: 'name', type: 'text' },
          { name: 'description', type: 'text', isNullable: true },

          { name: 'status', type: 'smallint', default: '1' },
          { name: 'effective_from', type: 'date', isNullable: true },
          { name: 'effective_to', type: 'date', isNullable: true },
          { name: 'inactivated_at', type: 'timestamptz', isNullable: true },
          { name: 'inactivation_reason', type: 'text', isNullable: true },

          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'created_by', type: 'bigint', isNullable: true },
          { name: 'updated_by', type: 'bigint', isNullable: true },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
          { name: 'deleted_by', type: 'bigint', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'md_category',
      new TableIndex({
        name: 'uq_md_category_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
    );

    // -----------------------------
    // md_sub_category
    // -----------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_sub_category',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'code', type: 'text' },
          { name: 'category_id', type: 'bigint' },
          { name: 'name', type: 'text' },
          { name: 'description', type: 'text', isNullable: true },

          { name: 'status', type: 'smallint', default: '1' },
          { name: 'effective_from', type: 'date', isNullable: true },
          { name: 'effective_to', type: 'date', isNullable: true },
          { name: 'inactivated_at', type: 'timestamptz', isNullable: true },
          { name: 'inactivation_reason', type: 'text', isNullable: true },

          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'created_by', type: 'bigint', isNullable: true },
          { name: 'updated_by', type: 'bigint', isNullable: true },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
          { name: 'deleted_by', type: 'bigint', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'md_sub_category',
      new TableIndex({
        name: 'uq_md_sub_category_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'md_sub_category',
      new TableIndex({
        name: 'ix_md_sub_category_company_category',
        columnNames: ['company_id', 'category_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'md_sub_category',
      new TableForeignKey({
        name: 'fk_md_sub_category_category',
        columnNames: ['category_id'],
        referencedTableName: 'md_category',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // -----------------------------
    // md_sku  (normalized version)
    // -----------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_sku',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'code', type: 'text' },
          { name: 'name', type: 'text' },

          { name: 'status', type: 'smallint', default: '1' },
          { name: 'effective_from', type: 'date', isNullable: true },
          { name: 'effective_to', type: 'date', isNullable: true },
          { name: 'inactivated_at', type: 'timestamptz', isNullable: true },
          { name: 'inactivation_reason', type: 'text', isNullable: true },

          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'created_by', type: 'bigint', isNullable: true },
          { name: 'updated_by', type: 'bigint', isNullable: true },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
          { name: 'deleted_by', type: 'bigint', isNullable: true },

          // Normalized references (bigint)
          { name: 'brand_id', type: 'bigint', isNullable: true },
          { name: 'category_id', type: 'bigint', isNullable: true },
          { name: 'sub_category_id', type: 'bigint', isNullable: true },

          { name: 'pack_size', type: 'text', isNullable: true },
          { name: 'base_uom', type: 'text' },
          { name: 'sales_uom', type: 'text' },
          { name: 'conversion_to_base', type: 'numeric', precision: 18, scale: 6, default: '1' },
          { name: 'mrp', type: 'numeric', precision: 18, scale: 2, isNullable: true },
          { name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: '0' },
          { name: 'is_batch_tracked', type: 'boolean', default: 'false' },
          { name: 'is_expiry_tracked', type: 'boolean', default: 'false' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'md_sku',
      new TableIndex({
        name: 'uq_md_sku_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'md_sku',
      new TableIndex({
        name: 'ix_md_sku_company_brand',
        columnNames: ['company_id', 'brand_id'],
      }),
    );

    await queryRunner.createIndex(
      'md_sku',
      new TableIndex({
        name: 'ix_md_sku_company_category',
        columnNames: ['company_id', 'category_id'],
      }),
    );

    await queryRunner.createIndex(
      'md_sku',
      new TableIndex({
        name: 'ix_md_sku_company_sub_category',
        columnNames: ['company_id', 'sub_category_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'md_sku',
      new TableForeignKey({
        name: 'fk_md_sku_brand',
        columnNames: ['brand_id'],
        referencedTableName: 'md_brand',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'md_sku',
      new TableForeignKey({
        name: 'fk_md_sku_category',
        columnNames: ['category_id'],
        referencedTableName: 'md_category',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'md_sku',
      new TableForeignKey({
        name: 'fk_md_sku_sub_category',
        columnNames: ['sub_category_id'],
        referencedTableName: 'md_sub_category',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop child first
    await queryRunner.dropTable('md_sku', true);
    await queryRunner.dropTable('md_sub_category', true);
    await queryRunner.dropTable('md_category', true);
    await queryRunner.dropTable('md_brand', true);
  }
}
