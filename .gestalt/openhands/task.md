# Implement this phase: Phase 5: LeavePolicy service

You are an autonomous coding agent working INSIDE an already-cloned git repository at `/tmp/gestalt/phase/a88212d7-6a1c-4612-8a09-8a5db627b262/5`. Do not clone anything; work only in this directory.

## What to build
(no phase architecture provided — infer from the success criteria below)

## Success criteria
Create src/modules/policy/policy.service.interface.ts with the IPolicyService interface declaring getPolicyByLeaveType, getPolicyById, getAllActivePolicies, createPolicy, updatePolicy, and deactivatePolicy methods. Create src/modules/policy/policy.service.ts implementing IPolicyService, injecting ILeavePolicyRepository from src/modules/policy/policy.repository.ts (Phase 2). Include Jest unit tests in tests/unit/modules/policy/policy.service.test.ts. This phase depends on src/modules/policy/policy.model.ts and src/modules/policy/policy.repository.ts from Phase 2 — read them before generating any code that references LeavePolicy or ILeavePolicyRepository.

## Project stack
Before writing code, read `HARNESS.json` in the working directory to learn the project's language, framework, and test runner, and follow the existing conventions in the repository. Read `docs/ARCHITECTURE.md` and `PLAN.md` if present.

## Constraints (mandatory)
- Write and modify source files ONLY. Do NOT run `git commit`, `git push`, `git add`, or any other git command. The platform handles all git operations.
- Do not create a new repository or change the git remote.
- Stay within the scope of this phase; do not implement deferred/later work.