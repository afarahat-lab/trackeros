import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_balances', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('employee_id').notNullable();
    table.uuid('leave_type_id').notNullable();
    table.decimal('entitlement_days').notNullable();
    table.decimal('used_days').notNullable().defaultTo(0);
    table.decimal('accrued_days').notNullable().defaultTo(0);
    table.integer('year').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable();

    table.foreign('leave_type_id').references('id').inTable('leave_policies');
    table.unique(['employee_id', 'leave_type_id', 'year']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_balances');
}
