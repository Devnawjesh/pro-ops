import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class InitProOps1760000000000 implements MigrationInterface {
  name = 'InitProOps1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================
    // MASTER
    // =========================

    await queryRunner.createTable(
      new Table({
        name: 'md_warehouse',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'code', type: 'text' },
          { name: 'name', type: 'text' },

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

          { name: 'owner_type', type: 'smallint' },
          { name: 'owner_id', type: 'bigint', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'lat', type: 'numeric', precision: 10, scale: 7, isNullable: true },
          { name: 'lng', type: 'numeric', precision: 10, scale: 7, isNullable: true },
          { name: 'is_batch_tracked', type: 'boolean', default: 'false' },
          { name: 'is_expiry_tracked', type: 'boolean', default: 'false' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_warehouse', [
      new TableIndex({
        name: 'uq_md_warehouse_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_warehouse_owner',
        columnNames: ['company_id', 'owner_type', 'owner_id'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'md_outlet',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'code', type: 'text' },
          { name: 'name', type: 'text' },

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

          { name: 'outlet_type', type: 'smallint' },
          { name: 'owner_name', type: 'text', isNullable: true },
          { name: 'mobile', type: 'text', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'lat', type: 'numeric', precision: 10, scale: 7, isNullable: true },
          { name: 'lng', type: 'numeric', precision: 10, scale: 7, isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_outlet', [
      new TableIndex({
        name: 'uq_md_outlet_company_code',
        columnNames: ['company_id', 'code'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_outlet_type',
        columnNames: ['company_id', 'outlet_type'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'md_outlet_org',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'outlet_id', type: 'bigint' },
          { name: 'org_node_id', type: 'bigint' },
          { name: 'effective_from', type: 'date' },
          { name: 'effective_to', type: 'date', isNullable: true },
          { name: 'status', type: 'smallint', default: '1' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('md_outlet_org', [
      new TableIndex({
        name: 'uq_md_outlet_org_hist',
        columnNames: ['company_id', 'outlet_id', 'effective_from'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_outlet_org_node',
        columnNames: ['company_id', 'org_node_id'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'md_outlet_distributor',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'outlet_id', type: 'bigint' },
          { name: 'distributor_id', type: 'bigint' },
          { name: 'effective_from', type: 'date' },
          { name: 'effective_to', type: 'date', isNullable: true },
          { name: 'status', type: 'smallint', default: '1' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndices('md_outlet_distributor', [
      new TableIndex({
        name: 'uq_md_outlet_distributor_hist',
        columnNames: ['company_id', 'outlet_id', 'effective_from'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_md_outlet_distributor',
        columnNames: ['company_id', 'distributor_id'],
      }),
    ]);


    // =========================
    // INVENTORY
    // =========================

    await queryRunner.createTable(
      new Table({
        name: 'inv_stock_balance',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'warehouse_id', type: 'bigint' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty_on_hand', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'qty_reserved', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'inv_stock_balance',
      new TableIndex({
        name: 'uq_inv_stock_balance',
        columnNames: ['company_id', 'warehouse_id', 'sku_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'inv_lot',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'warehouse_id', type: 'bigint' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'source_doc_type', type: 'smallint' },
          { name: 'source_doc_id', type: 'bigint' },
          { name: 'received_at', type: 'timestamptz' },
          { name: 'batch_no', type: 'text', isNullable: true },
          { name: 'expiry_date', type: 'date', isNullable: true },
          { name: 'unit_cost', type: 'numeric', precision: 18, scale: 4, isNullable: true },
          { name: 'qty_received', type: 'numeric', precision: 18, scale: 6 },
          { name: 'qty_available', type: 'numeric', precision: 18, scale: 6 },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('inv_lot', [
      new TableIndex({
        name: 'ix_inv_lot_fifo',
        columnNames: ['company_id', 'warehouse_id', 'sku_id', 'received_at'],
      }),
      new TableIndex({
        name: 'ix_inv_lot_avail',
        columnNames: ['company_id', 'warehouse_id', 'sku_id', 'qty_available'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'inv_txn',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'txn_time', type: 'timestamptz' },
          { name: 'txn_type', type: 'smallint' },
          { name: 'warehouse_id', type: 'bigint' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty_in', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'qty_out', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'ref_doc_type', type: 'smallint' },
          { name: 'ref_doc_id', type: 'bigint' },
          { name: 'remarks', type: 'text', isNullable: true },
          { name: 'created_by', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('inv_txn', [
      new TableIndex({
        name: 'ix_inv_txn_key',
        columnNames: ['company_id', 'warehouse_id', 'sku_id', 'txn_time'],
      }),
      new TableIndex({
        name: 'ix_inv_txn_ref',
        columnNames: ['company_id', 'ref_doc_type', 'ref_doc_id'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'inv_txn_lot',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'inv_txn_id', type: 'bigint' },
          { name: 'lot_id', type: 'bigint' },
          { name: 'qty', type: 'numeric', precision: 18, scale: 6 },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'inv_txn_lot',
      new TableIndex({
        name: 'uq_inv_txn_lot',
        columnNames: ['company_id', 'inv_txn_id', 'lot_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'inv_transfer',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'transfer_no', type: 'text' },
          { name: 'transfer_date', type: 'date' },
          { name: 'status', type: 'smallint', default: '1' },
          { name: 'from_warehouse_id', type: 'bigint' },
          { name: 'to_warehouse_id', type: 'bigint' },
          { name: 'dispatched_at', type: 'timestamptz', isNullable: true },
          { name: 'received_at', type: 'timestamptz', isNullable: true },
          { name: 'created_by_user_id', type: 'bigint' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('inv_transfer', [
      new TableIndex({
        name: 'uq_inv_transfer_no',
        columnNames: ['company_id', 'transfer_no'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_inv_transfer_status',
        columnNames: ['company_id', 'status'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'inv_transfer_item',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'transfer_id', type: 'bigint' },
          { name: 'line_no', type: 'int' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty_planned', type: 'numeric', precision: 18, scale: 6 },
          { name: 'qty_dispatched_total', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'qty_received_total', type: 'numeric', precision: 18, scale: 6, default: '0' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'inv_transfer_item',
      new TableIndex({
        name: 'uq_inv_transfer_item_line',
        columnNames: ['company_id', 'transfer_id', 'line_no'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'inv_transfer_in_transit',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'transfer_id', type: 'bigint' },
          { name: 'transfer_item_id', type: 'bigint' },
          { name: 'from_warehouse_id', type: 'bigint' },
          { name: 'to_warehouse_id', type: 'bigint' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty_dispatched', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'qty_received', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('inv_transfer_in_transit', [
      new TableIndex({
        name: 'uq_inv_transfer_transit_line',
        columnNames: ['company_id', 'transfer_item_id'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_inv_transfer_transit_by_transfer',
        columnNames: ['company_id', 'transfer_id'],
      }),
      new TableIndex({
        name: 'ix_inv_transfer_transit_by_route',
        columnNames: ['company_id', 'from_warehouse_id', 'to_warehouse_id'],
      }),
    ]);

    // GRN
    await queryRunner.createTable(
      new Table({
        name: 'inv_grn',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'grn_no', type: 'text' },
          { name: 'grn_date', type: 'date' },
          { name: 'status', type: 'smallint', default: '1' },
          { name: 'warehouse_id', type: 'bigint' },
          { name: 'supplier_name', type: 'text', isNullable: true },
          { name: 'reference_no', type: 'text', isNullable: true },
          { name: 'created_by_user_id', type: 'bigint' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('inv_grn', [
      new TableIndex({
        name: 'uq_inv_grn_no',
        columnNames: ['company_id', 'grn_no'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_inv_grn_status',
        columnNames: ['company_id', 'status'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'inv_grn_item',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'grn_id', type: 'bigint' },
          { name: 'line_no', type: 'int' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty_expected', type: 'numeric', precision: 18, scale: 6 },
          { name: 'qty_received_total', type: 'numeric', precision: 18, scale: 6, default: '0' },
          { name: 'unit_cost', type: 'numeric', precision: 18, scale: 4, isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'inv_grn_item',
      new TableIndex({
        name: 'uq_inv_grn_item_line',
        columnNames: ['company_id', 'grn_id', 'line_no'],
        isUnique: true,
      }),
    );

    // =========================
    // SALES + ALLOCATION + INVOICE
    // =========================

    await queryRunner.createTable(
      new Table({
        name: 'so_order',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'order_no', type: 'text' },
          { name: 'order_date', type: 'date' },
          { name: 'status', type: 'smallint', default: '1' },
          { name: 'outlet_id', type: 'bigint' },
          { name: 'distributor_id', type: 'bigint' },
          { name: 'created_by_user_id', type: 'bigint' },
          { name: 'gross_amount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'discount_amount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'net_amount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'remarks', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('so_order', [
      new TableIndex({
        name: 'uq_so_order_no',
        columnNames: ['company_id', 'order_no'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_so_order_status',
        columnNames: ['company_id', 'status'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'so_order_item',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'order_id', type: 'bigint' },
          { name: 'line_no', type: 'int' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty', type: 'numeric', precision: 18, scale: 6 },
          { name: 'unit_price', type: 'numeric', precision: 18, scale: 2 },
          { name: 'line_discount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'line_total', type: 'numeric', precision: 18, scale: 2 },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'so_order_item',
      new TableIndex({
        name: 'uq_so_order_item_line',
        columnNames: ['company_id', 'order_id', 'line_no'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'so_allocation',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'order_id', type: 'bigint' },
          { name: 'warehouse_id', type: 'bigint' },
          { name: 'allocated_at', type: 'timestamptz' },
          { name: 'allocated_by_user_id', type: 'bigint', isNullable: true },
          { name: 'status', type: 'smallint', default: '1' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'so_allocation',
      new TableIndex({
        name: 'uq_so_allocation_order',
        columnNames: ['company_id', 'order_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'so_allocation_item',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'allocation_id', type: 'bigint' },
          { name: 'order_item_id', type: 'bigint' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty_allocated', type: 'numeric', precision: 18, scale: 6 },
          { name: 'qty_invoiced', type: 'numeric', precision: 18, scale: 6, default: '0' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'so_allocation_item',
      new TableIndex({
        name: 'uq_so_alloc_item',
        columnNames: ['company_id', 'allocation_id', 'order_item_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'so_allocation_lot',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'allocation_item_id', type: 'bigint' },
          { name: 'lot_id', type: 'bigint' },
          { name: 'qty_reserved', type: 'numeric', precision: 18, scale: 6 },
          { name: 'qty_consumed', type: 'numeric', precision: 18, scale: 6, default: '0' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'so_allocation_lot',
      new TableIndex({
        name: 'uq_so_alloc_lot',
        columnNames: ['company_id', 'allocation_item_id', 'lot_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'ar_invoice',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'invoice_no', type: 'text' },
          { name: 'invoice_date', type: 'date' },
          { name: 'status', type: 'smallint', default: '1' },
          { name: 'distributor_id', type: 'bigint' },
          { name: 'warehouse_id', type: 'bigint' },
          { name: 'created_by_user_id', type: 'bigint' },
          { name: 'gross_amount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'discount_amount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'net_amount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('ar_invoice', [
      new TableIndex({
        name: 'uq_ar_invoice_no',
        columnNames: ['company_id', 'invoice_no'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'ix_ar_invoice_status',
        columnNames: ['company_id', 'status'],
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'ar_invoice_item',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'invoice_id', type: 'bigint' },
          { name: 'line_no', type: 'int' },
          { name: 'sku_id', type: 'bigint' },
          { name: 'qty', type: 'numeric', precision: 18, scale: 6 },
          { name: 'unit_price', type: 'numeric', precision: 18, scale: 2 },
          { name: 'line_discount', type: 'numeric', precision: 18, scale: 2, default: '0' },
          { name: 'line_total', type: 'numeric', precision: 18, scale: 2 },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ar_invoice_item',
      new TableIndex({
        name: 'uq_ar_invoice_item_line',
        columnNames: ['company_id', 'invoice_id', 'line_no'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'ar_invoice_order',
        columns: [
          { name: 'id', type: 'bigserial', isPrimary: true },
          { name: 'company_id', type: 'bigint' },
          { name: 'invoice_id', type: 'bigint' },
          { name: 'order_id', type: 'bigint' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'ar_invoice_order',
      new TableIndex({
        name: 'uq_ar_invoice_order',
        columnNames: ['company_id', 'invoice_id', 'order_id'],
        isUnique: true,
      }),
    );

    // =========================
    // BASIC FKs (safe ones)
    // =========================
    // If you want, I can add ALL FKs (company, user, org node), but these may fail if those tables aren't created yet.

    await queryRunner.createForeignKeys('inv_stock_balance', [
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        referencedTableName: 'md_warehouse',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('inv_lot', [
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        referencedTableName: 'md_warehouse',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('inv_txn', [
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        referencedTableName: 'md_warehouse',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('inv_txn_lot', [
      new TableForeignKey({
        columnNames: ['inv_txn_id'],
        referencedTableName: 'inv_txn',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['lot_id'],
        referencedTableName: 'inv_lot',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('inv_transfer_item', [
      new TableForeignKey({
        columnNames: ['transfer_id'],
        referencedTableName: 'inv_transfer',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('inv_transfer_in_transit', [
      new TableForeignKey({
        columnNames: ['transfer_id'],
        referencedTableName: 'inv_transfer',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['transfer_item_id'],
        referencedTableName: 'inv_transfer_item',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['from_warehouse_id'],
        referencedTableName: 'md_warehouse',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['to_warehouse_id'],
        referencedTableName: 'md_warehouse',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('inv_grn', [
      new TableForeignKey({
        columnNames: ['warehouse_id'],
        referencedTableName: 'md_warehouse',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('inv_grn_item', [
      new TableForeignKey({
        columnNames: ['grn_id'],
        referencedTableName: 'inv_grn',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('so_order_item', [
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'so_order',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('so_allocation_item', [
      new TableForeignKey({
        columnNames: ['allocation_id'],
        referencedTableName: 'so_allocation',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['order_item_id'],
        referencedTableName: 'so_order_item',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('so_allocation_lot', [
      new TableForeignKey({
        columnNames: ['allocation_item_id'],
        referencedTableName: 'so_allocation_item',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['lot_id'],
        referencedTableName: 'inv_lot',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('ar_invoice_item', [
      new TableForeignKey({
        columnNames: ['invoice_id'],
        referencedTableName: 'ar_invoice',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['sku_id'],
        referencedTableName: 'md_sku',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);

    await queryRunner.createForeignKeys('ar_invoice_order', [
      new TableForeignKey({
        columnNames: ['invoice_id'],
        referencedTableName: 'ar_invoice',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedTableName: 'so_order',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order of dependencies (simplified)
    await queryRunner.dropTable('ar_invoice_order', true);
    await queryRunner.dropTable('ar_invoice_item', true);
    await queryRunner.dropTable('ar_invoice', true);

    await queryRunner.dropTable('so_allocation_lot', true);
    await queryRunner.dropTable('so_allocation_item', true);
    await queryRunner.dropTable('so_allocation', true);
    await queryRunner.dropTable('so_order_item', true);
    await queryRunner.dropTable('so_order', true);

    await queryRunner.dropTable('inv_grn_item', true);
    await queryRunner.dropTable('inv_grn', true);

    await queryRunner.dropTable('inv_transfer_in_transit', true);
    await queryRunner.dropTable('inv_transfer_item', true);
    await queryRunner.dropTable('inv_transfer', true);

    await queryRunner.dropTable('inv_txn_lot', true);
    await queryRunner.dropTable('inv_txn', true);
    await queryRunner.dropTable('inv_lot', true);
    await queryRunner.dropTable('inv_stock_balance', true);

    await queryRunner.dropTable('md_sku', true);
    await queryRunner.dropTable('md_outlet_distributor', true);
    await queryRunner.dropTable('md_outlet_org', true);
    await queryRunner.dropTable('md_outlet', true);
    await queryRunner.dropTable('md_warehouse', true);
    await queryRunner.dropTable('md_distributor', true);
  }
}
