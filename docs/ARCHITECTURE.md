# Architecture — trackeros

## Style: modular monolith

## Layer structure

```
src/
├── modules/          # business domain modules — own their data and routes
│   ├── WelcomeScreen/ # module for WelcomeScreen entity
│   ├── StartButton/  # module for StartButton entity
├── shared/
│   ├── db/           # repository implementations
│   ├── auth/         # authentication + RBAC
│   └── utils/        # cross-cutting helpers
└── api/              # route registration
src/modules/Shared/    — Shared module
src/modules/DB/        — DB module
src/modules/Auth/      — Auth module
src/modules/Utils/     — Utils module
src/modules/API/       — API module
src/modules/PriceFormatter/    — PriceFormatter module
```

## Dependency rules

- Modules may only import from each other's index.ts
- All database access through src/shared/db/ repositories
- No circular dependencies
- No direct DB calls outside repository classes
