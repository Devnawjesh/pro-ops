import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMdCompany1699999999998 implements MigrationInterface {
  name = 'CreateMdCompany1699999999998';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'md_company',
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

          // Company extra fields
          { name: 'legal_name', type: 'text', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'md_company',
      new TableIndex({ name: 'IDX_md_company_company_id', columnNames: ['company_id'] }),
    );
    await queryRunner.createIndex(
      'md_company',
      new TableIndex({ name: 'IDX_md_company_status', columnNames: ['status'] }),
    );

    // matches @Index(['company_id','code'], { unique: true })
    await queryRunner.createIndex(
      'md_company',
      new TableIndex({
        name: 'UQ_md_company_company_code',
        isUnique: true,
        columnNames: ['company_id', 'code'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('md_company', true);
  }
}
