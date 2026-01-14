import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateMdRoute1700000000300 implements MigrationInterface {
  name = 'CreateMdRoute1700000000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'md_route',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },

          { name: 'company_id', type: 'bigint', isNullable: false },
          { name: 'code', type: 'text', isNullable: false },
          { name: 'name', type: 'text', isNullable: false },

          { name: 'status', type: 'smallint', isNullable: false, default: '1' },

          { name: 'effective_from', type: 'date', isNullable: true },
          { name: 'effective_to', type: 'date', isNullable: true },

          { name: 'inactivated_at', type: 'timestamptz', isNullable: true },
          { name: 'inactivation_reason', type: 'text', isNullable: true },

          { name: 'created_at', type: 'timestamptz', isNullable: false, default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', isNullable: false, default: 'now()' },

          { name: 'created_by', type: 'bigint', isNullable: true },
          { name: 'updated_by', type: 'bigint', isNullable: true },

          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
          { name: 'deleted_by', type: 'bigint', isNullable: true },

          // Route fields
          { name: 'territory_id', type: 'bigint', isNullable: false },
          { name: 'default_delivery_day', type: 'smallint', isNullable: true },
          { name: 'is_delivery_route', type: 'boolean', isNullable: false, default: 'true' },
        ],
      }),
      true,
    );

    // Base indexes
    await queryRunner.createIndex(
      'md_route',
      new TableIndex({ name: 'IDX_md_route_company_id', columnNames: ['company_id'] }),
    );
    await queryRunner.createIndex(
      'md_route',
      new TableIndex({ name: 'IDX_md_route_status', columnNames: ['status'] }),
    );

    // Entity indexes
    await queryRunner.createIndex(
      'md_route',
      new TableIndex({
        name: 'UQ_md_route_company_code',
        isUnique: true,
        columnNames: ['company_id', 'code'],
      }),
    );

    await queryRunner.createIndex(
      'md_route',
      new TableIndex({
        name: 'IDX_md_route_territory_id',
        columnNames: ['territory_id'],
      }),
    );

    // FK: company_id -> md_company.id
    await queryRunner.createForeignKey(
      'md_route',
      new TableForeignKey({
        name: 'FK_md_route_company',
        columnNames: ['company_id'],
        referencedTableName: 'md_company',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // FK: territory_id -> md_org_hierarchy.id
    await queryRunner.createForeignKey(
      'md_route',
      new TableForeignKey({
        name: 'FK_md_route_territory',
        columnNames: ['territory_id'],
        referencedTableName: 'md_org_hierarchy',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('md_route', true);
  }
}
