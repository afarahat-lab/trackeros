# Trackeros Web

React + TypeScript + Vite single-page application for the Trackeros leave
management system. It talks to the local Fastify backend over HTTP through a
Vite dev-server proxy.

## Prerequisites

- Node.js (see the root project for the expected version)
- A running instance of the backend Fastify API on `http://localhost:3000`

## Install

```bash
npm install
```

## Run the dev server

```bash
npm run dev
```

The Vite dev server proxies API requests to the local Fastify API so the
browser never talks to the backend directly. The proxy maps these paths to
`http://localhost:3000`:

| Path         | Target                   |
| ------------ | ------------------------ |
| `/auth`      | `http://localhost:3000`  |
| `/employees` | `http://localhost:3000`  |
| `/leaves`    | `http://localhost:3000`  |
| `/balances`  | `http://localhost:3000`  |

## Production build

```bash
npm run build
```

This type-checks the project (`tsc --noEmit`) and then produces a production
bundle with `vite build`. The output is written to `dist/`.

## Tests

```bash
npm test
```

Runs the Vitest suite (component tests with Testing Library and API-client
tests against a mocked `fetch`).

## Authentication

- The bearer token is persisted in **`sessionStorage`** (key
  `trackeros.token`). It is cleared when the tab closes, but survives a page
  reload so the user is not thrown back to the login screen on refresh.
- On startup, if a token is present the app re-fetches the profile via
  `getMe`; until that resolves the route guard holds (renders nothing) rather
  than rendering a blank authenticated page.
- Every authenticated request sends `Authorization: Bearer <token>`.
- If any authenticated request returns **401**, the token is cleared and the
  route guard redirects to `/login`. Token expiry is not decoded client-side —
  the server's 401 is the single source of truth.
- A failed login surfaces the server's error message verbatim and never
  reveals whether the email address exists.
