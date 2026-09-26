/**
 * Add the GP-008 reversal link to leave_requests.
 *
 * `reverses_request_id` is nullable: null on every ordinary request, and non-null only
 * on a reversal instance, where it holds the id of the original request it reverses.
 * It is set once at insert and never updated, so the approved row it points at stays
 * immutable in storage.
 *
 * The unique index is PARTIAL (`WHERE reverses_request_id IS NOT NULL`) for two reasons:
 * any number of ordinary rows may share a NULL value (a plain unique index would reject
 * the second NULL-free row on some engines and is the wrong constraint entirely), while
 * at most one reversal may reference any given original id. That partial uniqueness is
 * what makes a concurrent double-cancellation impossible rather than merely unlikely.
 *
 * The partial-index predicate is standard SQL accepted by both pg and sqlite3, so a
 * single `knex.raw` stays portable across the migration's two targets. The column uses
 * the same string/FK style as `leave_requests.id` in the initial schema.
 */

const INDEX_NAME = 'leave_requests_reverses_request_id_unique';

exports.up = async function up(knex) {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.string('reverses_request_id').references('id').inTable('leave_requests');
  });
  await knex.raw(
    `CREATE UNIQUE INDEX ${INDEX_NAME} ON leave_requests (reverses_request_id) ` +
      'WHERE reverses_request_id IS NOT NULL'
  );
};

exports.down = async function down(knex) {
  await knex.raw(`DROP INDEX IF EXISTS ${INDEX_NAME}`);
  await knex.schema.alterTable('leave_requests', (t) => {
    t.dropColumn('reverses_request_id');
  });
};
