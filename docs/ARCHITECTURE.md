# Architecture — trackeros

## Overview

The system will use a RESTful API built with Express and TypeScript for the backend. The frontend will be a React application, communicating with the backend via HTTP. PostgreSQL will be used for data persistence.

## Stack

- Runtime: Node 22 LTS
- Package manager: npm
- Test framework: Jest
- Backend: Express
- Frontend: React
- Database: PostgreSQL

## Module structure

```
src/
  controllers/
  models/
  routes/
  services/
  views/
  utils/
public/
  index.html
  styles/
  scripts/
config/
tests/
```

## Key patterns

- See `AGENTS.md` for stack-specific coding conventions
- See `docs/GOLDEN_PRINCIPLES.md` for the non-negotiable rules every
  cycle is checked against

## Dependency rules

- Modules import from each other ONLY through their declared public
  entry point (`index.ts`, `__init__.py`, package root — whatever the
  stack uses)
- All database access goes through a repository layer — no inline SQL
  / ORM calls in route handlers or business logic
- No circular dependencies between modules
