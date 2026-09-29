/**
 * Add the reversal provenance column to leave_requests.
 *
 * A cancellation of an APPROVED request is represented by inserting a NEW
 * CANCELLED row that reverses the original (GP-008 reversals). `reverses_request_id`
 * is null for every ordinary request and non-null only on a reversal row, where it
 * equals the id of the original APPROVED request it reverses. It is set at INSERT
 * time only and is never updated afterwards.
 *
 * Nullable: ordinary requests carry no reversal, and the self-referencing FK to
 * leave_requests.id ties a reversal to its immutable original.
 *
 * The UNIQUE index is the database backstop for "an APPROVED request cannot be
 * cancelled twice": that invariant protects "released exactly once", and a
 * service-only guard is lost the moment a second code path inserts. The service
 * also calls findByReversesRequestId inside the transaction and throws
 * ConflictError 409 — belt and braces.
 *
 * [BINDING RULE] A reversal row copies the original's `requested_days` verbatim
 * (never re-derived, never zeroed), so ANY aggregation that sums requested_days
 * MUST filter on `reverses_request_id IS NULL`. Without that filter the original
 * APPROVED row and its reversal row would be double-counted.
 *
 * Targets PostgreSQL (the declared database). Kept as a text column to match the
 * string/text id style of the schema.
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.text('reverses_request_id')
      .nullable()
      .references('id')
      .inTable('leave_requests')
      .withKeyName('leave_requests_reverses_request_id_foreign');
    t.unique('reverses_request_id', {
      indexName: 'leave_requests_reverses_request_id_unique',
    });
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('leave_requests', (t) => {
    t.dropUnique('reverses_request_id', 'leave_requests_reverses_request_id_unique');
    t.dropForeign('reverses_request_id', 'leave_requests_reverses_request_id_foreign');
    t.dropColumn('reverses_request_id');
  });
};
