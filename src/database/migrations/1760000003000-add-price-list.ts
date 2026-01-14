import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class AddPriceList1760000003000 implements MigrationInterface {
  name = 'AddPriceList1760000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------
    // md_price_list
    // -------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_price_list',
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

          { name: 'price_list_type', type: 'smallint', isNullable: false },
          { name: 'remarks', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_price_list', [
      new TableIndex({
        name: 'uq_md_price_list_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_price_list_company_type',
        columnNames: ['company_id', 'price_list_type'],
      }),
    ]);

    // -------------------------
    // md_price_list_item
    // -------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_price_list_item',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },

          { name: 'company_id', type: 'bigint', isNullable: false },
          { name: 'code', type: 'text', isNullable: true },
          { name: 'name', type: 'text', isNullable: true },

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

          { name: 'price_list_id', type: 'bigint', isNullable: false },
          { name: 'sku_id', type: 'bigint', isNullable: false },

          { name: 'mrp', type: 'numeric', precision: 18, scale: 2, isNullable: true },
          { name: 'tp', type: 'numeric', precision: 18, scale: 2, isNullable: true },
          { name: 'dp', type: 'numeric', precision: 18, scale: 2, isNullable: true },
          { name: 'vat_rate', type: 'numeric', precision: 5, scale: 2, default: '0' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_price_list_item', [
      new TableIndex({
        name: 'uq_md_price_list_item_hist',
        columnNames: ['company_id', 'price_list_id', 'sku_id', 'effective_from'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_price_list_item_sku',
        columnNames: ['company_id', 'sku_id'],
      }),
    ]);

    await queryRunner.createForeignKeys('md_price_list_item', [
      new TableForeignKey({
        columnNames: ['price_list_id'],
        referencedTableName: 'md_price_list',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    // FK to SKU (your table name is md_sku in earlier design)
    const hasSku = await queryRunner.hasTable('md_sku');
    if (hasSku) {
      await queryRunner.createForeignKey(
        'md_price_list_item',
        new TableForeignKey({
          columnNames: ['sku_id'],
          referencedTableName: 'md_sku',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
    }

    // -------------------------
    // md_price_list_scope
    // -------------------------
    await queryRunner.createTable(
      new Table({
        name: 'md_price_list_scope',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },

          { name: 'company_id', type: 'bigint', isNullable: false },
          { name: 'code', type: 'text', isNullable: true },
          { name: 'name', type: 'text', isNullable: true },

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

          { name: 'price_list_id', type: 'bigint', isNullable: false },
          { name: 'distributor_id', type: 'bigint', isNullable: true },
          { name: 'outlet_type', type: 'smallint', isNullable: true },
          { name: 'org_node_id', type: 'bigint', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_price_list_scope', [
      new TableIndex({
        name: 'uq_md_price_list_scope_hist',
        columnNames: [
          'company_id',
          'price_list_id',
          'distributor_id',
          'outlet_type',
          'org_node_id',
          'effective_from',
        ],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_price_list_scope_distributor',
        columnNames: ['company_id', 'distributor_id'],
      }),
      new TableIndex({
        name: 'ix_md_price_list_scope_org',
        columnNames: ['company_id', 'org_node_id'],
      }),
    ]);

    await queryRunner.createForeignKeys('md_price_list_scope', [
      new TableForeignKey({
        columnNames: ['price_list_id'],
        referencedTableName: 'md_price_list',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    // Optional FK: distributor (md_distributor exists in your model)
    const hasDistributor = await queryRunner.hasTable('md_distributor');
    if (hasDistributor) {
      await queryRunner.createForeignKey(
        'md_price_list_scope',
        new TableForeignKey({
          columnNames: ['distributor_id'],
          referencedTableName: 'md_distributor',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }

    // Optional FK: org node table name varies (md_org_node / org_hierarchy)
    const hasOrgNode = await queryRunner.hasTable('md_org_node');
    if (hasOrgNode) {
      await queryRunner.createForeignKey(
        'md_price_list_scope',
        new TableForeignKey({
          columnNames: ['org_node_id'],
          referencedTableName: 'md_org_node',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('md_price_list_scope', true);
    await queryRunner.dropTable('md_price_list_item', true);
    await queryRunner.dropTable('md_price_list', true);
  }
}
