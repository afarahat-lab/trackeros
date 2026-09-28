/**
 * Add the self-referencing reversal link to leave_requests.
 *
 * `reverses_request_id` is NULL on an original leave request. On a reversal row it equals
 * the `id` of the original request that row reverses. It is write-once at insert and never
 * updated: a reversal row is terminal and is never itself reversed.
 *
 * Kept as a text column (not uuid, no NOT NULL, no foreign key) to match how
 * leave_requests.id and the table's other free-text columns are typed in the initial
 * schema, so the schema stays portable across pg and sqlite3. Every row that existed
 * before this migration remains valid and readable with a NULL value.
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.text('reverses_request_id');
  });

  // Unique PARTIAL index: at most one reversal may reference any given original. The
  // `WHERE reverses_request_id IS NOT NULL` predicate is load-bearing — every original
  // row carries NULL and NULLs must not collide with each other. This index is the
  // exactly-once guarantee for a reversal.
  await knex.raw(
    'CREATE UNIQUE INDEX leave_requests_reverses_request_id_unique ' +
      'ON leave_requests (reverses_request_id) WHERE reverses_request_id IS NOT NULL'
  );
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS leave_requests_reverses_request_id_unique');
  await knex.schema.alterTable('leave_requests', (t) => {
    t.dropColumn('reverses_request_id');
  });
};
