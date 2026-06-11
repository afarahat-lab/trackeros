import { describe, it, expectTypeOf } from "vitest";
import type { AuditRepository } from "../../../../src/modules/audit/audit.repository";
import type {
  AuditRecord,
  CreateAuditRecordInput,
} from "../../../../src/modules/audit/audit.model";

describe("audit repository contracts", () => {
  it("compiles with the declared contract types", () => {
    expectTypeOf<AuditRecord>().toBeObject();
    expectTypeOf<CreateAuditRecordInput>().toBeObject();
    expectTypeOf<AuditRepository>().toBeObject();
  });
});
