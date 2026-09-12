/**
 * Initial schema — every table the repositories already query.
 *
 * Derived column-by-column from the repositories' own SELECT lists, not from the models,
 * because the repository is what actually talks to the database:
 *   employees            employee.repository.ts findById
 *   leave_types          leave-type.repository.ts COLUMNS
 *   leave_policies       policy.repository.ts COLUMNS
 *   leave_balances       balance.repository.ts COLUMNS
 *   leave_requests       leave.repository.ts COLUMNS  (incl. cancelled_by / cancelled_at,
 *                        which the cancellation feature writes)
 *   audit_logs           audit.repository.ts COLUMNS
 *   notifications        notification.repository.ts COLUMNS
 *
 * Kept portable across pg and sqlite3 (string ids rather than native uuid, text timestamps
 * where sqlite has no type) so the smoke check can run migrate -> boot -> probe against a
 * throwaway file database with no container.
 */

exports.up = async function up(knex) {
  await knex.schema.createTable('employees', (t) => {
    t.string('id').primary();
    t.string('employee_number').notNullable().unique();
    t.string('first_name').notNullable();
    t.string('last_name').notNullable();
    t.string('email').notNullable().unique();
    t.string('role').notNullable();               // EMPLOYEE | MANAGER | ADMIN
    t.string('manager_id').references('id').inTable('employees');
    t.string('department');
    t.date('hire_date').notNullable();
    t.date('termination_date');
    t.string('employment_status').notNullable();  // ACTIVE | TERMINATED | ON_LEAVE
  });

  await knex.schema.createTable('leave_types', (t) => {
    t.string('code').primary();                   // annual | sick | emergency | unpaid | maternity | paternity
    t.string('name').notNullable();
    t.boolean('requires_approval').notNullable().defaultTo(true);
    t.integer('max_consecutive_days');
    t.boolean('is_paid').notNullable().defaultTo(true);
  });

  await knex.schema.createTable('leave_policies', (t) => {
    t.string('id').primary();
    t.string('leave_type_code').notNullable().references('code').inTable('leave_types');
    t.string('policy_name').notNullable();
    t.integer('annual_entitlement_days').notNullable();
    t.integer('accrual_period_months').notNullable();
    t.integer('carry_forward_days').notNullable().defaultTo(0);
    t.integer('min_notice_days').notNullable().defaultTo(0);
    t.integer('max_request_days');
    t.boolean('requires_manager_approval').notNullable().defaultTo(true);
    t.date('effective_from').notNullable();
    t.date('effective_to');
    t.string('status').notNullable();
  });

  await knex.schema.createTable('leave_balances', (t) => {
    t.string('id').primary();
    t.string('employee_id').notNullable().references('id').inTable('employees');
    t.string('leave_type_code').notNullable().references('code').inTable('leave_types');
    t.date('period_start').notNullable();
    t.date('period_end').notNullable();
    t.integer('entitled_days').notNullable().defaultTo(0);
    t.integer('used_days').notNullable().defaultTo(0);
    t.integer('pending_days').notNullable().defaultTo(0);
    // findByKey looks a balance up by exactly this tuple.
    t.unique(['employee_id', 'leave_type_code', 'period_start', 'period_end']);
  });

  await knex.schema.createTable('leave_requests', (t) => {
    t.string('id').primary();
    t.string('employee_id').notNullable().references('id').inTable('employees');
    t.string('leave_type_code').notNullable().references('code').inTable('leave_types');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.integer('requested_days').notNullable();
    t.text('reason');
    t.string('status').notNullable();             // DRAFT | SUBMITTED | APPROVED | REJECTED | CANCELLED
    t.string('approver_id').references('id').inTable('employees');
    t.text('approval_comment');
    t.timestamp('submitted_at');
    t.timestamp('decided_at');
    // Written by the cancellation feature; no migration previously created them.
    t.string('cancelled_by').references('id').inTable('employees');
    t.timestamp('cancelled_at');
    t.index(['employee_id', 'status']);
  });

  await knex.schema.createTable('audit_logs', (t) => {
    t.string('id').primary();
    t.string('actor_id').notNullable();
    t.string('action').notNullable();             // CREATE | UPDATE | DELETE | APPROVE | REJECT | CANCEL
    t.string('entity_type').notNullable();
    t.string('entity_id').notNullable();
    // text, NOT json/jsonb — this matches the repository's actual contract: AuditLogRow
    // declares `before_state: string | null`, create() inserts JSON.stringify(...), and
    // mapRow() reads it back with JSON.parse(...). A real `json` column is auto-parsed by
    // node-pg into an object, so JSON.parse() then receives an object and dies with
    // `"[object Object]" is not valid JSON`. Storing these as jsonb would be the better
    // design, but that is a change to working application code, not to the schema that
    // has to match it. (sqlite cannot catch this: its `json` type IS text.)
    t.text('before_state');
    t.text('after_state');
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
    t.index(['entity_type', 'entity_id']);
  });

  await knex.schema.createTable('notifications', (t) => {
    t.string('id').primary();
    t.string('recipient_id').notNullable().references('id').inTable('employees');
    t.string('type').notNullable();
    t.string('title').notNullable();
    t.text('message').notNullable();
    t.string('related_entity_type');
    t.string('related_entity_id');
    t.string('status').notNullable().defaultTo('unread');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('read_at');
    t.index(['recipient_id', 'status']);
  });
};

exports.down = async function down(knex) {
  // Reverse dependency order.
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('leave_requests');
  await knex.schema.dropTableIfExists('leave_balances');
  await knex.schema.dropTableIfExists('leave_policies');
  await knex.schema.dropTableIfExists('leave_types');
  await knex.schema.dropTableIfExists('employees');
};
