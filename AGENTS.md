# AGENTS.md — trackeros

This file is the primary agent orientation document for this project.
Read this file completely before taking any action.

## What this project is

A corporate leave management system for a mid-size company.
Employees can apply for different types of leave: annual, sick, and emergency.
Managers can approve or reject leave requests with comments.
HR administrators can configure leave policies, view team calendars, and generate reports.
The system must enforce leave balance limits and prevent overlapping requests.
Built with TypeScript, Node.js, Express, PostgreSQL, and npm.
Uses Jest for testing.

## Project stack

- Runtime: Node 22 LTS
- Package manager: npm
- Test framework: Jest
- Backend: Express
- Database: PostgreSQL

See `docs/ARCHITECTURE.md` for the full architecture overview and
module layout.

Note: the Gestalt platform itself runs on Node 20 + pnpm 9.x as a
self-imposed constraint. That has no bearing on this project —
user projects use whatever stack matches their description.

## Architecture rules

1. Modules never import from each other's internals — only from index.ts
2. All database access through the repository pattern
3. Every state-changing operation produces an audit record (GP-001)
4. RBAC enforced at middleware, never inline (GP-002)

## When context is missing

Emit a `CONTEXT_GAP` signal with the specific missing information identified.

## Operator notes — Git credential scopes

The personal access token registered with this project drives BOTH the
platform's clone/push and the deploy layer's CI/CD calls. Required scopes:

- **GitHub PAT (classic)** — `repo` (clone, push, create PRs) +
  `workflow` (dispatch GitHub Actions workflows). Fine-grained PATs need
  Contents: read+write, Pull requests: read+write, Actions: read+write,
  Workflows: read+write.
- **GitLab Project Access Token** — `api` + `write_repository`.
- **Azure DevOps PAT** — `Code (Read & Write)` + `Build (Read & Execute)`.

Without the workflow scope the deploy layer's pipeline-agent will fail with
a `GOLDEN_PRINCIPLE_BREACH` signal and the intent will be escalated for
human review. Re-issue the PAT with the missing scope and re-register the
project to recover.

## Custom agents

Project-specific agents can be defined in `agents.yaml` under
`custom_agents`. They run after the framework generate agents
(intent / design / context / lint-config / code / test) and BEFORE
dispatch to the quality gate. Each custom agent receives the
generated artifacts as part of its prompt and returns structured
findings.

The orchestrator routes findings to typed signals the gate
evaluates:

- `high` severity findings → `CONSTRAINT_VIOLATION`
- `medium` / `low` findings → `LINT_FAILURE`
- LLM error or response parse failure → `CONTEXT_GAP`

Custom agents **never** emit `GOLDEN_PRINCIPLE_BREACH` — that
signal type is reserved for framework infrastructure agents and
the review-agent.

See `agents.yaml` for the full schema and a commented-out example.
Run `gestalt agents list <projectName>` to see the active agents
for this project; `gestalt agents validate <projectName>` checks
that your custom-agent definitions parse cleanly.

## What agents must never do

Agents must adhere to all defined principles, including GP-003 and GP-004, to ensure compliance and integrity within the project framework.
