All three files have been created successfully and verification has passed. Here's a summary:

### Files Created

1. **`src/modules/status/status.routes.ts`** — Express router with a `GET /status` endpoint that returns `{ status: 'ok', timestamp: <ISO string> }`

2. **`src/modules/status/index.ts`** — Barrel export re-exporting everything from `./status.routes`

3. **`tests/unit/modules/status/status.test.ts`** — Unit test verifying the router is defined, the `/status` route exists, and it responds to GET requests

### Verification Results
- ✅ `find src -name '*.ts' ...` — Source files found
- ✅ `npm run build` — TypeScript compilation successful (no errors)
- ✅ `npx jest --passWithNoTests` — 1 test suite, 1 test passed