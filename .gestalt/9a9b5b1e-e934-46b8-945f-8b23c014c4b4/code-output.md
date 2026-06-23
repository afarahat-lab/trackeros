All 5 files have been created successfully and verification has passed:

**Files created:**
1. ✅ `src/modules/audit/audit.model.ts` — Imports and re-exports `AuditRecord` and `CreateAuditRecordDto` from shared types, exports `AuditAction` enum
2. ✅ `src/modules/audit/audit.repository.ts` — Exports `IAuditRepository` interface (with `findByEntity` and `create`) and `PgAuditRepository` class extending `BaseRepository<AuditRecord>`
3. ✅ `src/modules/audit/audit.service.ts` — Exports `IAuditService` interface (with `recordAction`) and `AuditService` class depending on `IAuditRepository`
4. ✅ `tests/unit/modules/audit/audit.repository.test.ts` — Tests for `PgAuditRepository.create` and `findByEntity` with mocked pool
5. ✅ `tests/unit/modules/audit/audit.service.test.ts` — Tests for `AuditService.recordAction` with mocked `IAuditRepository`

**Verification results:**
- **Build**: `tsc --noEmit` passed ✅
- **Tests**: 7 test suites, 28 tests all passed ✅

The audit module is complete and satisfies GP-002 — it provides a programmatic audit trail that can be called by other services (Balance, Leave) before any state-changing operations are built.