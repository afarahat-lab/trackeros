/**
 * Add a nullable credential column to `employees`.
 *
 * `password_hash` is text (not json) and nullable: null means "no local password set".
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable('employees', (t) => {
    t.text('password_hash');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('employees', (t) => {
    t.dropColumn('password_hash');
  });
};
