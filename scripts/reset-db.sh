#!/usr/bin/env bash
# ===========================================================================
# Dietetica Lembas -- Reset local development database
# ===========================================================================
# Drops and recreates the PostgreSQL database running in Docker, then applies
# all Flyway migrations from scratch using the backend's Maven wrapper.
#
# Usage:
#   ./scripts/reset-db.sh                  # full reset (down -v + migrate + seed)
#   ./scripts/reset-db.sh --seed-only      # only re-run seed data (skip full reset)
#   ./scripts/reset-db.sh --migrate-only   # only re-run Flyway migrations
#   ./scripts/reset-db.sh --help           # show this help
#
# Prerequisites:
#   - Docker Compose stack running (at least the db service)
#   - Maven + Java 21 available for Flyway commands
# ===========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker/compose.yml"
ENV_FILE="$PROJECT_ROOT/docker/.env"
ENV_FILE_EXAMPLE="$PROJECT_ROOT/docker/.env.example"
ENV_ARG=""

# Determine which .env file to use (prefer .env, fall back to .env.example)
if [ -f "$ENV_FILE" ]; then
  ENV_ARG="--env-file $ENV_FILE"
elif [ -f "$ENV_FILE_EXAMPLE" ]; then
  ENV_ARG="--env-file $ENV_FILE_EXAMPLE"
fi

DB_SERVICE="db"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Colours for pretty output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- Help ----
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  sed -n '/^#.*$/s/^# //p' "$0" | sed '1,/^$/d' | head -n -1
  exit 0
fi

# ---- Mode selection ----
MODE="${1:-full}"

run_flyway_migrate() {
  info "Running Flyway migrations..."
  (cd "$BACKEND_DIR" && ./mvnw flyway:migrate -Dflyway.skip=false)
  info "Migrations applied successfully."
}

run_seed() {
  info "Running seed data (V10__seed_data.sql via Flyway)..."
  # The seed migration is a regular Flyway migration; if it was already applied,
  # we force a re-run only when the caller explicitly asks for seed-only mode.
  if [ "$MODE" = "--seed-only" ]; then
    info "Flyway seed migration will be re-applied."
    (cd "$BACKEND_DIR" && ./mvnw flyway:migrate)
  else
    info "Seed data is included in the full migration run above."
  fi
  info "Seed data applied successfully."
}

case "$MODE" in
  --seed-only)
    info "Seed-only mode: re-running seed data..."
    # For seed-only, the seed migration has already been applied, so we use
    # Flyway's repair + migrate to re-apply it.  A more refined approach would
    # be a dedicated seed script that truncates seed tables first.
    (cd "$BACKEND_DIR" && ./mvnw flyway:repair flyway:migrate)
    info "Seed data refreshed."
    ;;

  --migrate-only)
    info "Migrate-only mode: re-running all Flyway migrations..."
    (cd "$BACKEND_DIR" && ./mvnw flyway:clean flyway:migrate)
    info "Migrations re-applied successfully."
    ;;

  --full | full | "")
    info "Full reset: destroying database volume and re-applying everything..."
    # Stop and remove the database volume
    docker compose -f "$COMPOSE_FILE" $ENV_ARG down -v
    # Start only the database service
    docker compose -f "$COMPOSE_FILE" $ENV_ARG up -d "$DB_SERVICE"
    # Wait for the database to become healthy
    info "Waiting for PostgreSQL to become healthy..."
    docker compose -f "$COMPOSE_FILE" $ENV_ARG exec "$DB_SERVICE" \
      sh -c 'until pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"; do sleep 1; done'
    info "PostgreSQL is ready."

    # Run Flyway migrations
    run_flyway_migrate
    info "Full reset complete. Database is fresh with all migrations and seed data."
    ;;

  *)
    error "Unknown mode: $MODE"
    echo "Usage: $0 [--full|--seed-only|--migrate-only|--help]"
    exit 1
    ;;
esac
