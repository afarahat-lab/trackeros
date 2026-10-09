#!/usr/bin/env bash
# Create trackeros's application database and a LEAST-PRIVILEGED role that owns it.
#
# 🔴 WHY THIS EXISTS. The repository has no database definition and no `.env.example`, and
# `knexfile.js` defaults to `user: 'postgres', password: 'postgres'` — the SUPERUSER. So whoever
# next stands up this database gets an app running as superuser, which is how the 2026-10-09
# credential leak came to disclose a superuser password rather than an application one. This script
# makes the FIRST database least-privileged, which is the only time it is cheap.
#
# WHAT THE ROLE GETS, AND WHY THAT IS EXACTLY ENOUGH. Knex migrations CREATE tables, so the role
# needs CREATE in the `public` schema. On PostgreSQL 15+ that comes free with database ownership and
# must not be granted separately: `public` is owned by `pg_database_owner` with
# `acl={pg_database_owner=UC/...,=U/...}` — the database owner may create, and PUBLIC may only use.
# Verified against 15.19. On PostgreSQL 14 and earlier, `public` was world-writable and the grant
# would have been redundant in the other direction, so this script requires 15+ rather than
# branching on a permission model that inverted.
#
# What it deliberately does NOT get: SUPERUSER, CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS.
#
# Run as a superuser, ONCE, against the server that will host the database:
#     PGPASSWORD=<superuser pw> ./scripts/setup-db-role.sh [host] [port] [superuser]
# It prints the generated application password ONCE, to stdout. Put it in `.env`; it is not stored.
set -euo pipefail

HOST="${1:-localhost}"
PORT="${2:-5432}"
SUPERUSER="${3:-postgres}"
APP_ROLE="${APP_ROLE:-trackeros_app}"
APP_DB="${APP_DB:-trackeros}"

psql_super() { psql -h "$HOST" -p "$PORT" -U "$SUPERUSER" -v ON_ERROR_STOP=1 -At "$@"; }

major=$(psql_super -d postgres -c "SHOW server_version_num;")
if [ "$major" -lt 150000 ]; then
  echo "🔴 PostgreSQL $major: this script assumes 15+, where the \`public\` schema belongs to" >&2
  echo "   pg_database_owner so database ownership alone grants CREATE. On 14 and earlier the" >&2
  echo "   permission model is inverted and the role needs different grants — do not guess." >&2
  exit 1
fi

# A generated password, never a default. `openssl` is used rather than $RANDOM so this is not
# predictable from the time of day.
APP_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"

exists=$(psql_super -d postgres -c "SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}';")
if [ "$exists" = "1" ]; then
  echo "Role ${APP_ROLE} exists — rotating its password, leaving its privileges alone."
  psql_super -d postgres -c "ALTER ROLE ${APP_ROLE} WITH PASSWORD '${APP_PASSWORD}';" >/dev/null
else
  psql_super -d postgres -c "CREATE ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_PASSWORD}'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;" >/dev/null
  echo "Created role ${APP_ROLE} (login only: no superuser, no createdb, no createrole)."
fi

db_exists=$(psql_super -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '${APP_DB}';")
if [ "$db_exists" = "1" ]; then
  echo "Database ${APP_DB} exists — reassigning ownership to ${APP_ROLE}."
  psql_super -d postgres -c "ALTER DATABASE ${APP_DB} OWNER TO ${APP_ROLE};" >/dev/null
else
  psql_super -d postgres -c "CREATE DATABASE ${APP_DB} OWNER ${APP_ROLE};" >/dev/null
  echo "Created database ${APP_DB} owned by ${APP_ROLE}."
fi

# ── Verify, rather than assume. Each of these has been a real failure mode somewhere. ──
echo
echo "Verifying:"
su_flag=$(psql_super -d postgres -c "SELECT rolsuper OR rolcreatedb OR rolcreaterole FROM pg_roles WHERE rolname='${APP_ROLE}';")
[ "$su_flag" = "f" ] || { echo "  🔴 ${APP_ROLE} still holds superuser/createdb/createrole" >&2; exit 1; }
echo "  ok  ${APP_ROLE} has no superuser / createdb / createrole"

owner=$(psql_super -d postgres -c "SELECT pg_get_userbyid(datdba) FROM pg_database WHERE datname='${APP_DB}';")
[ "$owner" = "${APP_ROLE}" ] || { echo "  🔴 ${APP_DB} is owned by ${owner}, not ${APP_ROLE}" >&2; exit 1; }
echo "  ok  ${APP_DB} is owned by ${APP_ROLE}"

# The migration precondition: can the role actually create a table in `public`?
PGPASSWORD="$APP_PASSWORD" psql -h "$HOST" -p "$PORT" -U "${APP_ROLE}" -d "${APP_DB}" \
  -v ON_ERROR_STOP=1 -At -c "CREATE TABLE _setup_probe(id int); DROP TABLE _setup_probe;" >/dev/null
echo "  ok  ${APP_ROLE} can create and drop a table in public (what knex migrations need)"

# And the privilege it must NOT have.
if PGPASSWORD="$APP_PASSWORD" psql -h "$HOST" -p "$PORT" -U "${APP_ROLE}" -d "${APP_DB}" \
     -v ON_ERROR_STOP=1 -At -c "CREATE DATABASE _setup_probe_db;" >/dev/null 2>&1; then
  psql_super -d postgres -c "DROP DATABASE IF EXISTS _setup_probe_db;" >/dev/null
  echo "  🔴 ${APP_ROLE} WAS able to create a database — it is not least-privileged" >&2
  exit 1
fi
echo "  ok  ${APP_ROLE} cannot create a database"

echo
echo "Put this in .env (it is not stored anywhere else):"
echo "  DATABASE_URL=postgres://${APP_ROLE}:${APP_PASSWORD}@${HOST}:${PORT}/${APP_DB}"
