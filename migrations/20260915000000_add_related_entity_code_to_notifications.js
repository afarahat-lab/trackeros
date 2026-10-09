/**
 * Add the related-entity code column to notifications, and the entity-correlation
 * index that docs/ARCHITECTURE.md already documents.
 *
 * `related_entity_code` carries the related entity's human/machine code — for the
 * cancellation notifications this feature emits, the leave type code. It is GENERIC
 * (a code for whatever `related_entity_type` names), not leave-specific, so the single
 * notifications table stays one concept and no new table is introduced. The request id
 * continues to live in `related_entity_id`; the leave type is not derivable from it
 * without the join the requirement forbids, and free text is not machine-readable.
 *
 * Nullable, with no default and no backfill: notifications unrelated to a coded entity
 * (and every row written before this migration) legitimately carry no code. It is never
 * synthesized to a non-null value by the repository or service.
 *
 * The `(related_entity_type, related_entity_id)` index is added HERE, in the same
 * migration as the column: the entity linkage on notifications is load-bearing for the
 * first time in this feature, and ARCHITECTURE.md already claims the index exists (the
 * initial migration creates `(recipient_id, status)` but not this one). Only that drift
 * is fixed; the rest of the initial migration is left as-is.
 *
 * Targets PostgreSQL (the declared database). Kept as a text column to match the
 * string/text style of the initial schema.
 */

const ENTITY_INDEX = 'notifications_related_entity_type_related_entity_id_index';

exports.up = async function up(knex) {
  await knex.schema.alterTable('notifications', (t) => {
    t.text('related_entity_code');
    t.index(['related_entity_type', 'related_entity_id'], ENTITY_INDEX);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('notifications', (t) => {
    t.dropIndex(['related_entity_type', 'related_entity_id'], ENTITY_INDEX);
    t.dropColumn('related_entity_code');
  });
};
