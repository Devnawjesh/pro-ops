import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMdDistributor1700000000150 implements MigrationInterface {
  name = 'CreateMdDistributor1700000000150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'md_distributor',
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

          { name: 'distributor_type', type: 'smallint', isNullable: false },
          { name: 'parent_distributor_id', type: 'bigint', isNullable: true },
          { name: 'trade_name', type: 'text', isNullable: true },
          { name: 'owner_name', type: 'text', isNullable: true },
          { name: 'mobile', type: 'text', isNullable: true },
          { name: 'email', type: 'text', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'credit_limit', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'payment_terms_days', type: 'int', default: '0' },
          { name: 'vat_registration_no', type: 'text', isNullable: true },
          { name: 'tin_no', type: 'text', isNullable: true },
          { name: 'erp_partner_id', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

        await queryRunner.createIndices('md_distributor', [
      new TableIndex({
        name: 'uq_md_distributor_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_distributor_company_type',
        columnNames: ['company_id', 'distributor_type'],
      }),
      new TableIndex({
        name: 'ix_md_distributor_company_parent',
        columnNames: ['company_id', 'parent_distributor_id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('md_distributor', true);
  }
}
