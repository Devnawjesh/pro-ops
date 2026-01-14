import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateMdUserScope1700000000400 implements MigrationInterface {
  name = 'CreateMdUserScope1700000000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'md_user_scope',
        columns: [
          { name: 'id', type: 'bigint', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },

          { name: 'company_id', type: 'bigint', isNullable: false },
          { name: 'user_id', type: 'bigint', isNullable: false },
          { name: 'scope_type', type: 'smallint', isNullable: false },

          { name: 'org_node_id', type: 'bigint', isNullable: true },
          { name: 'route_id', type: 'bigint', isNullable: true },
          { name: 'distributor_id', type: 'bigint', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'md_user_scope',
      new TableIndex({ name: 'IDX_md_user_scope_company_id', columnNames: ['company_id'] }),
    );
    await queryRunner.createIndex(
      'md_user_scope',
      new TableIndex({ name: 'IDX_md_user_scope_user_id', columnNames: ['user_id'] }),
    );

    // matches @Index([...], { unique: true })
    await queryRunner.createIndex(
      'md_user_scope',
      new TableIndex({
        name: 'UQ_md_user_scope_tuple',
        isUnique: true,
        columnNames: [
          'company_id',
          'user_id',
          'scope_type',
          'org_node_id',
          'route_id',
          'distributor_id',
        ],
      }),
    );

    // FKs (update md_user/md_distributor table names if yours differ)
    await queryRunner.createForeignKeys('md_user_scope', [
      new TableForeignKey({
        name: 'FK_md_user_scope_user',
        columnNames: ['user_id'],
        referencedTableName: 'md_user', // <-- ensure your User table name
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_md_user_scope_org_node',
        columnNames: ['org_node_id'],
        referencedTableName: 'md_org_hierarchy',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'FK_md_user_scope_route',
        columnNames: ['route_id'],
        referencedTableName: 'md_route',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        name: 'FK_md_user_scope_distributor',
        columnNames: ['distributor_id'],
        referencedTableName: 'md_distributor', // <-- ensure your Distributor table name
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('md_user_scope', true);
  }
}
