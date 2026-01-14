import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateMdOrgHierarchy1700000000200 implements MigrationInterface {
  name = 'CreateMdOrgHierarchy1700000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'md_org_hierarchy',
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

          // OrgHierarchy fields
          { name: 'level_no', type: 'smallint', isNullable: false },
          { name: 'parent_id', type: 'bigint', isNullable: true },
          { name: 'path', type: 'text', isNullable: true },
          { name: 'sort_order', type: 'int', isNullable: false, default: '0' },
        ],
      }),
      true,
    );

    // Base indexes
    await queryRunner.createIndex(
      'md_org_hierarchy',
      new TableIndex({ name: 'IDX_md_org_hierarchy_company_id', columnNames: ['company_id'] }),
    );
    await queryRunner.createIndex(
      'md_org_hierarchy',
      new TableIndex({ name: 'IDX_md_org_hierarchy_status', columnNames: ['status'] }),
    );

    // Entity indexes
    await queryRunner.createIndex(
      'md_org_hierarchy',
      new TableIndex({
        name: 'UQ_md_org_hierarchy_company_code',
        isUnique: true,
        columnNames: ['company_id', 'code'],
      }),
    );

    await queryRunner.createIndex(
      'md_org_hierarchy',
      new TableIndex({
        name: 'IDX_md_org_hierarchy_company_level',
        columnNames: ['company_id', 'level_no'],
      }),
    );

    await queryRunner.createIndex(
      'md_org_hierarchy',
      new TableIndex({
        name: 'IDX_md_org_hierarchy_parent_id',
        columnNames: ['parent_id'],
      }),
    );

    // FK: company_id -> md_company.id
    await queryRunner.createForeignKey(
      'md_org_hierarchy',
      new TableForeignKey({
        name: 'FK_md_org_hierarchy_company',
        columnNames: ['company_id'],
        referencedTableName: 'md_company',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    // FK: parent_id -> md_org_hierarchy.id
    await queryRunner.createForeignKey(
      'md_org_hierarchy',
      new TableForeignKey({
        name: 'FK_md_org_hierarchy_parent',
        columnNames: ['parent_id'],
        referencedTableName: 'md_org_hierarchy',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('md_org_hierarchy', true);
  }
}
