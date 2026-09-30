// Minimal ESLint config — ONLY the rules that back a declared HARNESS constraint.
//
// Deliberately not a broad ruleset. Every rule here must be traceable to `constraints.rules` in
// HARNESS.json, because a lint config that also enforces fifty style preferences turns a
// constraint violation into one line of noise among fifty, and the project's own CI is
// `--max-warnings 0` — so an opinion added here becomes a blocking failure nobody agreed to.
//
// Today that is exactly one rule. `no-any` (HARNESS constraints, severity high) declares
// `enforcer: ci` naming this project's Lint job, and this is what that job runs. Before this
// config existed the step silently SKIPPED — it invoked `npm run lint`, which was
// `echo "No lint configured"` — so the constraint read as enforced while nothing checked it.
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '.gestalt/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      // HARNESS constraints.rules → no-any (severity: high)
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
