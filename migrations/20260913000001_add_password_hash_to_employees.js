/**
 * Add the login credential column to employees.
 *
 * `password_hash` is nullable: null means the employee has no login credential set
 * (the employee record may exist before a credential is issued). It is never
 * synthesized or defaulted to a non-null value by the repository or service.
 *
 * Kept as a text column (not json) to match the initial schema's string/text style
 * and stay portable across pg and sqlite3.
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
