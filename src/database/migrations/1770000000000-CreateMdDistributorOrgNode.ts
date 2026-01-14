// src/migrations/1710000000000-CreateMdDistributorOrgNode.ts
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateMdDistributorOrgNode1710000000000 implements MigrationInterface {
  name = 'CreateMdDistributorOrgNode1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'md_distributor_org_node',
        columns: [
          {
            name: 'id',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'company_id', type: 'bigint', isNullable: false },
          { name: 'distributor_id', type: 'bigint', isNullable: false },
          { name: 'org_node_id', type: 'bigint', isNullable: false },

          // audit (recommended)
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
      'md_distributor_org_node',
      new TableIndex({
        name: 'uq_md_distributor_org_node_company_dist_node',
        columnNames: ['company_id', 'distributor_id', 'org_node_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'md_distributor_org_node',
      new TableIndex({
        name: 'ix_md_distributor_org_node_company_node',
        columnNames: ['company_id', 'org_node_id'],
      }),
    );

    await queryRunner.createIndex(
      'md_distributor_org_node',
      new TableIndex({
        name: 'ix_md_distributor_org_node_company_dist',
        columnNames: ['company_id', 'distributor_id'],
      }),
    );

    await queryRunner.createForeignKey(
      'md_distributor_org_node',
      new TableForeignKey({
        name: 'fk_md_distributor_org_node_distributor',
        columnNames: ['distributor_id'],
        referencedTableName: 'md_distributor',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'md_distributor_org_node',
      new TableForeignKey({
        name: 'fk_md_distributor_org_node_org_node',
        columnNames: ['org_node_id'],
        referencedTableName: 'md_org_hierarchy',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('md_distributor_org_node', 'fk_md_distributor_org_node_org_node');
    await queryRunner.dropForeignKey('md_distributor_org_node', 'fk_md_distributor_org_node_distributor');

    await queryRunner.dropIndex('md_distributor_org_node', 'ix_md_distributor_org_node_company_dist');
    await queryRunner.dropIndex('md_distributor_org_node', 'ix_md_distributor_org_node_company_node');
    await queryRunner.dropIndex('md_distributor_org_node', 'uq_md_distributor_org_node_company_dist_node');

    await queryRunner.dropTable('md_distributor_org_node');
  }
}
