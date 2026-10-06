# Refused writes — awaiting a human decision

_Generated 2026-10-06 09:33:11Z · correlation `618b461a-f7a0-528f-9d17-d56051cae7ba`._

1 write(s) were refused, 0 of them because the target is a GOVERNANCE file. A refusal is not a judgement that the change is wrong — it is the platform declining to let an agent edit the rules it is judged by. The proposed content is reproduced in full below so it can be applied by hand if it is right.

**To ratify one:** apply the content yourself and commit it, or record the decision as an ADR in `docs/DECISIONS.md`. **To reject one:** delete its section from this file. Leaving this file in place is not a decision — it is a queue.

## 1. `docs/ARCHITECTURE.md`

- **Proposed by:** context-agent
- **Refused because:** refusing a section-addressed write of docs/ARCHITECTURE.md: no section titled "### 10. Open questions". Read the file (readFile with section=…) to see its headings.

<details><summary>Proposed content (verbatim)</summary>

```
### 10. Open questions

1. **Probe time bound** — RESOLVED by the delivered Phase 1 implementation. The connectivity query is bounded by the module-level named constant `READINESS_QUERY_TIMEOUT_MS = 2000` in `uptime.repository.ts`, enforced by racing the query against a timer (`Promise.race`) so the bound is owned by the readiness check rather than inherited from the pool's `connectionTimeoutMillis` or a caller's deadline. A hung pool now produces `NOT_READY` instead of hanging the probe. Recorded as binding rule 3a.
2. **Round trip vs client acquisition** — RESOLVED by the delivered Phase 1 implementation. A successful round trip is required: `PgReadinessRepository.check()` awaits the query itself, not merely client acquisition, and `check()` deliberately takes no optional trailing `PoolClient` so the probe can never join a caller's transaction. Recorded as binding rule 3b.
3. **Caching / memoization** — the binding rule says no caching; a future TTL would introduce a staleness bound and a third probe concern. Still open as a future concern only: the delivered code caches nothing, and every `checkReadiness()` call performs a fresh round trip.
4. **`/ready` auth exemption** — inferred, not stated by the spec; it edits a shared, security-relevant file and makes database availability publicly observable. Still open; it is a Phase 2 concern (`PUBLIC_PATHS`), not part of the Phase 1 delivery.
5. **`src/modules/status/` dead code** — remove, leave, or reconcile (reconciling would create the shared health abstraction the feature forbids). RESOLVED: left untouched, out of scope for this feature; unreconciled by decision, not by omission.

```

</details>
