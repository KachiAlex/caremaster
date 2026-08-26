exports.up = async function(knex) {
  // Add missing columns to billing_plans for full pricing + tier support
  const billingPlansColumns = [
    { name: 'institution_id', type: 'uuid' },
    { name: 'tier', type: 'string' },
    { name: 'weekly_price', type: 'decimal' },
    { name: 'monthly_price', type: 'decimal' },
    { name: 'annual_price', type: 'decimal' },
    { name: 'yearly_price', type: 'decimal' },
    { name: 'currency', type: 'string' },
    { name: 'is_active', type: 'boolean' },
    { name: 'sort_order', type: 'integer' },
    { name: 'status', type: 'string' },
  ];

  for (const col of billingPlansColumns) {
    const hasColumn = await knex.schema.hasColumn('billing_plans', col.name);
    if (!hasColumn) {
      await knex.schema.table('billing_plans', (table) => {
        if (col.type === 'uuid') table.uuid(col.name).nullable();
        if (col.type === 'string') table.string(col.name).nullable();
        if (col.type === 'decimal') table.decimal(col.name, 12, 2).nullable();
        if (col.type === 'integer') table.integer(col.name).nullable();
        if (col.type === 'boolean') table.boolean(col.name).defaultTo(true);
      });
    }
  }

  // Client subscriptions
  await knex.schema.createTableIfNotExists('client_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.uuid('client_id').nullable();
    table.uuid('plan_id').nullable();
    table.string('plan_name').nullable();
    table.string('plan_tier').nullable();
    table.string('billing_cycle').nullable(); // weekly, monthly, annual
    table.decimal('price', 12, 2).nullable();
    table.string('currency').defaultTo('USD');
    table.string('status').defaultTo('active'); // active, cancelled, expired
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.date('next_billing_date').nullable();
    table.timestamp('cancelled_at').nullable();
    table.timestamps(true, true);
  });

  // Billing settings per institution
  await knex.schema.createTableIfNotExists('billing_settings', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').unique().nullable();
    table.string('currency').defaultTo('USD');
    table.jsonb('enabled_frequencies').nullable();
    table.string('default_frequency').defaultTo('monthly');
    table.decimal('tax_rate', 5, 4).nullable();
    table.string('tax_label').nullable();
    table.jsonb('taxes').nullable();
    table.string('invoice_prefix').nullable();
    table.text('invoice_notes').nullable();
    table.integer('payment_terms_days').nullable();
    table.decimal('late_fee_percentage', 5, 2).nullable();
    table.boolean('auto_generate_invoices').defaultTo(true);
    table.boolean('send_invoice_reminders').defaultTo(true);
    table.jsonb('reminder_days').nullable();
    table.timestamps(true, true);
  });

  // Analytics events for admin dashboard
  await knex.schema.createTableIfNotExists('analytics_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.uuid('user_id').nullable();
    table.string('event_type').nullable();
    table.jsonb('details').nullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('analytics_events');
  await knex.schema.dropTableIfExists('billing_settings');
  await knex.schema.dropTableIfExists('client_subscriptions');
};
