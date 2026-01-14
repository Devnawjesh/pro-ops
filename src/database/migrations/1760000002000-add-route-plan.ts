// src/migrations/1760000002000-add-route-plan.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddRoutePlan1760000002000 implements MigrationInterface {
  name = 'AddRoutePlan1760000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dp_route_plan',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
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

          { name: 'org_route_node_id', type: 'bigint' },
          { name: 'plan_month', type: 'date' },
          { name: 'remarks', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('dp_route_plan', [
      new TableIndex({
        name: 'uq_dp_route_plan_month',
        columnNames: ['company_id', 'org_route_node_id', 'plan_month'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_dp_route_plan_month',
        columnNames: ['company_id', 'plan_month'],
      }),
    ]);

    // FK to org hierarchy (table name may be md_org_node or org_hierarchy in your project)
    const hasOrgNode = await queryRunner.hasTable('md_org_node');
    if (hasOrgNode) {
      await queryRunner.createForeignKey(
        'dp_route_plan',
        new TableForeignKey({
          columnNames: ['org_route_node_id'],
          referencedTableName: 'md_org_node',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
    }

    await queryRunner.createTable(
      new Table({
        name: 'dp_route_plan_outlet',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
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

          { name: 'route_plan_id', type: 'bigint' },
          { name: 'outlet_id', type: 'bigint' },
          { name: 'weekday', type: 'smallint', isNullable: true },
          { name: 'stop_seq', type: 'int', default: '0' },
          { name: 'frequency', type: 'smallint', default: '1' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('dp_route_plan_outlet', [
      new TableIndex({
        name: 'uq_dp_route_plan_outlet',
        columnNames: ['company_id', 'route_plan_id', 'outlet_id'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_dp_route_plan_outlet_outlet',
        columnNames: ['company_id', 'outlet_id'],
      }),
    ]);

    await queryRunner.createForeignKeys('dp_route_plan_outlet', [
      new TableForeignKey({
        columnNames: ['route_plan_id'],
        referencedTableName: 'dp_route_plan',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);

    // FK to outlet (md_outlet in our earlier design)
    const hasOutlet = await queryRunner.hasTable('md_outlet');
    if (hasOutlet) {
      await queryRunner.createForeignKey(
        'dp_route_plan_outlet',
        new TableForeignKey({
          columnNames: ['outlet_id'],
          referencedTableName: 'md_outlet',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dp_route_plan_outlet', true);
    await queryRunner.dropTable('dp_route_plan', true);
  }
}
