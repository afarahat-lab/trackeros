All files have been created and verification passes. Let me confirm the final state:

**Source files created:**
- `src/modules/notification/notification.model.ts` — re-exports `Notification` and `CreateNotificationDto` from shared types
- `src/modules/notification/notification.repository.ts` — `PgNotificationRepository` extending `BaseRepository<Notification>` with `findByRecipient`, `markAsSent`, `markAsRead`, `countUnread`
- `src/modules/notification/notification.service.ts` — `NotificationService` implementing `INotificationService` with audit integration on all state-changing operations
- `src/modules/notification/notification.controller.ts` — Fastify handlers with Zod validation and RBAC, async error handling (GP-006)
- `src/modules/notification/notification.routes.ts` — registers `GET /notifications`, `GET /notifications/:id`, `PATCH /notifications/:id/read`

**Test files created:**
- `tests/unit/modules/notification/notification.repository.test.ts`
- `tests/unit/modules/notification/notification.service.test.ts`
- `tests/unit/modules/notification/notification.controller.test.ts`

**Verification results:**
- ✅ TypeScript build passes (`tsc --noEmit`)
- ✅ All 12 test suites pass (65 tests total, including 3 new notification test suites)