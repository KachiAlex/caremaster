exports.up = async function(knex) {
  // Add missing columns to the existing inventory table
  const inventoryColumns = [
    { name: 'reorder_level', type: 'integer' },
    { name: 'last_restocked', type: 'timestamp' },
    { name: 'supplier_id', type: 'uuid' },
    { name: 'batch_number', type: 'string' },
    { name: 'last_restocked_date', type: 'timestamp' }
  ];

  for (const col of inventoryColumns) {
    const hasColumn = await knex.schema.hasColumn('inventory', col.name);
    if (!hasColumn) {
      await knex.schema.table('inventory', (table) => {
        if (col.type === 'integer') table.integer(col.name).nullable();
        if (col.type === 'timestamp') table.timestamp(col.name).nullable();
        if (col.type === 'uuid') table.uuid(col.name).nullable();
        if (col.type === 'string') table.string(col.name).nullable();
      });
    }
  }

  // Suppliers
  await knex.schema.createTableIfNotExists('suppliers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.string('name').notNullable();
    table.string('contact_person').nullable();
    table.string('email').nullable();
    table.string('phone').nullable();
    table.text('address').nullable();
    table.string('city').nullable();
    table.string('state').nullable();
    table.string('country').nullable();
    table.text('notes').nullable();
    table.string('status').defaultTo('active');
    table.timestamps(true, true);
  });

  // Purchase Orders
  await knex.schema.createTableIfNotExists('purchase_orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.uuid('supplier_id').nullable();
    table.string('po_number').nullable();
    table.string('status').defaultTo('draft');
    table.jsonb('items').nullable();
    table.timestamp('expected_delivery_date').nullable();
    table.decimal('total_amount', 12, 2).nullable();
    table.decimal('received_quantity', 12, 2).defaultTo(0);
    table.uuid('created_by').nullable();
    table.uuid('approved_by').nullable();
    table.timestamp('approved_at').nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
  });

  // Goods Received Notes
  await knex.schema.createTableIfNotExists('goods_received', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.uuid('purchase_order_id').nullable();
    table.uuid('supplier_id').nullable();
    table.string('grn_number').nullable();
    table.timestamp('received_date').nullable();
    table.string('status').defaultTo('pending');
    table.jsonb('items').nullable();
    table.text('notes').nullable();
    table.timestamps(true, true);
  });

  // Stock Audit Trail
  await knex.schema.createTableIfNotExists('stock_audit', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.uuid('inventory_id').nullable();
    table.string('type').nullable(); // received, created, adjusted, consumed, etc.
    table.integer('quantity').nullable();
    table.integer('previous_stock').nullable();
    table.integer('new_stock').nullable();
    table.string('reference').nullable();
    table.string('reference_type').nullable();
    table.text('notes').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('stock_audit');
  await knex.schema.dropTableIfExists('goods_received');
  await knex.schema.dropTableIfExists('purchase_orders');
  await knex.schema.dropTableIfExists('suppliers');
};
