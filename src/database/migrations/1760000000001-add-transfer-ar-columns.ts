import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTransferArColumns1760000000001 implements MigrationInterface {
  name = 'AddTransferArColumns1760000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS ar_invoice_no_seq`);

    await queryRunner.addColumn(
      'inv_transfer_item',
      new TableColumn({
        name: 'dp_price',
        type: 'numeric',
        precision: 18,
        scale: 2,
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'ar_invoice',
      new TableColumn({
        name: 'ref_doc_type',
        type: 'smallint',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'ar_invoice',
      new TableColumn({
        name: 'ref_doc_id',
        type: 'bigint',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'ar_invoice',
      new TableColumn({
        name: 'ref_doc_no',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('ar_invoice', 'ref_doc_no');
    await queryRunner.dropColumn('ar_invoice', 'ref_doc_id');
    await queryRunner.dropColumn('ar_invoice', 'ref_doc_type');
    await queryRunner.dropColumn('inv_transfer_item', 'dp_price');
    await queryRunner.query(`DROP SEQUENCE IF EXISTS ar_invoice_no_seq`);
  }
}
