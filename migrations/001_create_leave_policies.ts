import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_policies', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('policy_name').notNullable();
    table.string('leave_type').notNullable();
    table.integer('entitlement_days').notNullable();
    table.decimal('accrual_rate').nullable();
    table.decimal('max_accumulation').nullable();
    table.integer('minimum_notice_days').nullable();
    table.boolean('requires_manager_approval').notNullable().defaultTo(true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable();
  });

  await knex.raw(`
    ALTER TABLE leave_policies
    ADD CONSTRAINT leave_policies_leave_type_check
    CHECK (leave_type IN ('annual', 'sick', 'emergency', 'unpaid', 'maternity', 'paternity'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_policies');
}
