/**
 * Add a nullable `password_hash` column to `employees` for credential auth.
 * Nullable with no default so existing rows carry no credential until set.
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
