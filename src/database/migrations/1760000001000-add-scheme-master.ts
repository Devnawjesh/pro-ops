import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddSchemeMaster1760000001000 implements MigrationInterface {
  name = 'AddSchemeMaster1760000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------
    // md_scheme
    // -------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_scheme',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },

          { name: 'company_id', type: 'bigint', isNullable: false },
          { name: 'code', type: 'text', isNullable: false },
          { name: 'name', type: 'text', isNullable: false },

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

          { name: 'scheme_type', type: 'smallint', isNullable: false },
          { name: 'priority', type: 'int', default: '0' },
          { name: 'can_stack', type: 'boolean', default: 'false' },

          { name: 'distributor_id', type: 'bigint', isNullable: true },
          { name: 'outlet_type', type: 'smallint', isNullable: true },
          { name: 'org_node_id', type: 'bigint', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_scheme', [
      new TableIndex({
        name: 'uq_md_scheme_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_scheme_company_type',
        columnNames: ['company_id', 'scheme_type'],
      }),
      new TableIndex({
        name: 'ix_md_scheme_company_distributor',
        columnNames: ['company_id', 'distributor_id'],
      }),
      new TableIndex({
        name: 'ix_md_scheme_company_org',
        columnNames: ['company_id', 'org_node_id'],
      }),
    ]);

    // Optional FK: md_distributor
    const hasDistributor = await queryRunner.hasTable('md_distributor');
    if (hasDistributor) {
      await queryRunner.createForeignKey(
        'md_scheme',
        new TableForeignKey({
          columnNames: ['distributor_id'],
          referencedTableName: 'md_distributor',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    // Optional FK: md_org_node / org hierarchy table name may differ in your project
    const hasOrgNode = await queryRunner.hasTable('md_org_node');
    if (hasOrgNode) {
      await queryRunner.createForeignKey(
        'md_scheme',
        new TableForeignKey({
          columnNames: ['org_node_id'],
          referencedTableName: 'md_org_node',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    // -------------------------
    // md_scheme_rule
    // -------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_scheme_rule',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },

          { name: 'company_id', type: 'bigint', isNullable: false },

          // if using BaseMasterEntity for rules
          { name: 'code', type: 'text', isNullable: true }, // optional; keep nullable
          { name: 'name', type: 'text', isNullable: true }, // optional; keep nullable
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

          { name: 'scheme_id', type: 'bigint', isNullable: false },

          { name: 'buy_sku_id', type: 'bigint', isNullable: true },
          { name: 'min_qty', type: 'numeric', precision: 18, scale: 6, isNullable: true },
          { name: 'min_amount', type: 'numeric', precision: 18, scale: 2, isNullable: true },

          { name: 'free_sku_id', type: 'bigint', isNullable: true },
          { name: 'free_qty', type: 'numeric', precision: 18, scale: 6, isNullable: true },

          { name: 'discount_percent', type: 'numeric', precision: 6, scale: 2, isNullable: true },
          { name: 'discount_amount', type: 'numeric', precision: 18, scale: 2, isNullable: true },

          { name: 'sort_order', type: 'int', default: '0' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_scheme_rule', [
      new TableIndex({
        name: 'uq_md_scheme_rule_company_scheme_sort',
        columnNames: ['company_id', 'scheme_id', 'sort_order'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_scheme_rule_company_scheme',
        columnNames: ['company_id', 'scheme_id'],
      }),
      new TableIndex({
        name: 'ix_md_scheme_rule_buy_sku',
        columnNames: ['buy_sku_id'],
      }),
      new TableIndex({
        name: 'ix_md_scheme_rule_free_sku',
        columnNames: ['free_sku_id'],
      }),
    ]);

    await queryRunner.createForeignKeys('md_scheme_rule', [
      new TableForeignKey({
        columnNames: ['scheme_id'],
        referencedTableName: 'md_scheme',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    // FK to md_sku (your SKU table name in earlier design was md_sku)
    const hasSku = await queryRunner.hasTable('md_sku');
    if (hasSku) {
      await queryRunner.createForeignKeys('md_scheme_rule', [
        new TableForeignKey({
          columnNames: ['buy_sku_id'],
          referencedTableName: 'md_sku',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
        new TableForeignKey({
          columnNames: ['free_sku_id'],
          referencedTableName: 'md_sku',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('md_scheme_rule', true);
    await queryRunner.dropTable('md_scheme', true);
  }
}
