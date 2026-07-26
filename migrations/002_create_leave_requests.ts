import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('leave_requests', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('employee_id').notNullable();
    table.uuid('leave_type_id').notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.text('reason').nullable();
    table.string('status').notNullable().defaultTo('DRAFT');
    table.uuid('approved_by').nullable();
    table.timestamp('approved_at', { useTz: true }).nullable();
    table.uuid('rejected_by').nullable();
    table.timestamp('rejected_at', { useTz: true }).nullable();
    table.text('rejection_reason').nullable();
    table.uuid('cancelled_by').nullable();
    table.timestamp('cancelled_at', { useTz: true }).nullable();
    table.timestamp('created_at', { useTz: true }).notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable();

    table.foreign('leave_type_id').references('id').inTable('leave_policies');
  });

  await knex.raw(`
    ALTER TABLE leave_requests
    ADD CONSTRAINT leave_requests_status_check
    CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'))
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('leave_requests');
}
