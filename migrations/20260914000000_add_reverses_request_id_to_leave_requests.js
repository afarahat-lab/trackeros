/**
 * Reversal provenance for leave requests.
 *
 * A reversal is a NEW row (status CANCELLED) that points back at the APPROVED row it
 * reverses via `reverses_request_id`. The APPROVED row is never mutated — the reversal
 * is the only record that the leave was cancelled.
 *
 * The partial UNIQUE index is the concurrency backstop: two simultaneous cancellations
 * of the same original cannot both insert a reversal row, because the second one trips
 * the constraint. The service-level guard gives callers a clean 409; this index is what
 * makes a concurrent double-cancellation impossible rather than merely unlikely.
 *
 * Kept portable across pg and sqlite3 (both support self-referencing FKs and partial
 * unique indexes), so the smoke check can run migrate -> boot -> probe with no container.
 */

const INDEX_NAME = 'leave_requests_reverses_request_id_unique';

exports.up = async function up(knex) {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.string('reverses_request_id').references('id').inTable('leave_requests');
  });

  // knex.schema has no portable partial-index helper, so issue the SQL directly.
  await knex.raw(
    `CREATE UNIQUE INDEX ${INDEX_NAME} ` +
      'ON leave_requests (reverses_request_id) ' +
      'WHERE reverses_request_id IS NOT NULL'
  );
};

exports.down = async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS ${INDEX_NAME}`);
  await knex.schema.alterTable('leave_requests', (t) => {
    t.dropColumn('reverses_request_id');
  });
};
