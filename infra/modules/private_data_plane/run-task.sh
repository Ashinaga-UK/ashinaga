#!/usr/bin/env bash
# Runs inside CodeBuild, in the environment's private subnets.
# The database password is read from Secrets Manager and is never printed.
set -euo pipefail

: "${ENVIRONMENT:?ENVIRONMENT is required}"
: "${DB_TASK:?DB_TASK is required}"
: "${PRIVATE_CIDRS:?PRIVATE_CIDRS is required}"
: "${AWS_REGION:?AWS_REGION is required}"

cd "${CODEBUILD_SRC_DIR:?}"

lookup_secret() {
  local name="$1"
  local arn
  arn=$(aws secretsmanager list-secrets \
    --region "$AWS_REGION" \
    --query "SecretList[?contains(Name, '${name}')] | sort_by(@, &CreatedDate) | [-1].ARN" \
    --output text)
  if [ -z "$arn" ] || [ "$arn" = "None" ]; then
    echo "Could not find a secret whose name contains ${name}" >&2
    exit 1
  fi
  aws secretsmanager get-secret-value \
    --region "$AWS_REGION" \
    --secret-id "$arn" \
    --query SecretString \
    --output text
}

DB_IDENTIFIER="ashinaga-postgres-${ENVIRONMENT}"
DB_HOST=$(aws rds describe-db-instances \
  --region "$AWS_REGION" \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)
DB_NAME=$(aws rds describe-db-instances \
  --region "$AWS_REGION" \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].DBName' \
  --output text)
DB_USER=$(aws rds describe-db-instances \
  --region "$AWS_REGION" \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].MasterUsername' \
  --output text)
PUBLIC=$(aws rds describe-db-instances \
  --region "$AWS_REGION" \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --query 'DBInstances[0].PubliclyAccessible' \
  --output text)

echo "Database host: ${DB_HOST}"
echo "Database name: ${DB_NAME}"
echo "Database user: ${DB_USER}"
echo "PubliclyAccessible: ${PUBLIC}"

DB_PASSWORD=$(lookup_secret "ashinaga-db-password-${ENVIRONMENT}")
export DB_HOST DB_NAME DB_USER DB_PASSWORD
export DB_PORT=5432
export DB_SSL=true
export PGPASSWORD="$DB_PASSWORD"
export PGSSLMODE=require

CLIENT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT inet_client_addr();" | tr -d '[:space:]')
echo "inet_client_addr=${CLIENT}"

python3 - "$CLIENT" "$PUBLIC" "$PRIVATE_CIDRS" <<'PY'
import ipaddress
import sys

client_raw, public, cidrs_raw = sys.argv[1:]
if not client_raw:
    raise SystemExit("inet_client_addr() returned nothing")
client = ipaddress.ip_address(client_raw.split("/")[0])
networks = [ipaddress.ip_network(item) for item in cidrs_raw.split(",") if item]
inside = any(client in network for network in networks)
print(f"client {client} inside private CIDRs: {inside}")
if str(public).lower() == "false" and not inside:
    raise SystemExit(
        f"Database is private but inet_client_addr {client} is outside {cidrs_raw}"
    )
if str(public).lower() != "false":
    print("Database is still public. This address does not prove the security group rule.")
PY

case "$ENVIRONMENT" in
  test)
    export BETTER_AUTH_URL="https://api-test.ashinaga-uk.org"
    export STAFF_APP_URL="https://staff-test.ashinaga-uk.org"
    export SCHOLAR_APP_URL="https://scholar-test.ashinaga-uk.org"
    ;;
  prod)
    export BETTER_AUTH_URL="https://api.ashinaga-uk.org"
    export STAFF_APP_URL="https://staff.ashinaga-uk.org"
    export SCHOLAR_APP_URL="https://scholar.ashinaga-uk.org"
    ;;
  *)
    echo "Unknown environment: ${ENVIRONMENT}" >&2
    exit 1
    ;;
esac

if [ "$DB_TASK" = "bootstrap" ] || [ "$DB_TASK" = "populate" ]; then
  BETTER_AUTH_SECRET=$(lookup_secret "ashinaga-auth-secret-${ENVIRONMENT}")
  export BETTER_AUTH_SECRET
fi

# drizzle-kit and ts-node are devDependencies. A production NODE_ENV would skip them.
NODE_ENV=development pnpm install --frozen-lockfile

case "$DB_TASK" in
  migrate)
    export NODE_ENV=production
    node scripts/check-migration-journal.mjs
    (cd apps/api && pnpm db:migrate)
    APPLIED=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT created_at FROM drizzle.__drizzle_migrations")
    printf '%s\n' "$APPLIED" | node scripts/assert-applied-migrations.mjs
    ;;
  bootstrap)
    : "${STAFF_EMAIL:?bootstrap requires STAFF_EMAIL}"
    export NODE_ENV=production
    export STAFF_EMAIL
    (cd apps/api && pnpm db:bootstrap-prod "$STAFF_EMAIL")
    ;;
  populate)
    export NODE_ENV=test
    # dev-data prompts for an email on stdin. An empty answer skips that invite.
    (cd apps/api && echo "" | pnpm db:populate-dev)
    ;;
  *)
    echo "Unknown DB task: ${DB_TASK}" >&2
    exit 1
    ;;
esac
