#!/usr/bin/env bash
# Starts the in-VPC CodeBuild database task when the project exists.
# Exit 42 means the project is not applied yet and the database is still public,
# so the caller may use the GitHub-hosted runner. Any other non-zero status is a failure.
set -euo pipefail

ENVIRONMENT="${1:?environment (test or prod)}"
DB_TASK="${2:?task (migrate, bootstrap, or populate)}"
STAFF_EMAIL="${3:-}"
AWS_REGION="${AWS_REGION:-eu-west-3}"
PROJECT="ashinaga-db-tasks-${ENVIRONMENT}"
BUCKET="ashinaga-db-tasks-${ENVIRONMENT}"

case "$DB_TASK" in
  migrate|bootstrap|populate) ;;
  *)
    echo "Unknown database task: ${DB_TASK}" >&2
    exit 1
    ;;
esac

if [ "$DB_TASK" = "bootstrap" ]; then
  if [[ ! "$STAFF_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    echo "Invalid staff email: ${STAFF_EMAIL}" >&2
    exit 1
  fi
fi

# CONFIRM before apply. These must match the private_subnet_cidrs in
# infra/accounts/test/terraform.tfvars and infra/accounts/prod/terraform.tfvars.
# Live subnet CIDRs could not be read from this machine, so the blocks assume
# the standard default VPC 172.31.0.0/16.
case "$ENVIRONMENT" in
  test) PRIVATE_CIDRS="172.31.200.0/24,172.31.201.0/24" ;;
  prod) PRIVATE_CIDRS="172.31.210.0/24,172.31.211.0/24" ;;
  *)
    echo "Unknown environment: ${ENVIRONMENT}" >&2
    exit 1
    ;;
esac

use_runner_because_database_is_public() {
  local reason="$1"
  local public
  public=$(aws rds describe-db-instances \
    --region "$AWS_REGION" \
    --db-instance-identifier "ashinaga-postgres-${ENVIRONMENT}" \
    --query 'DBInstances[0].PubliclyAccessible' \
    --output text)
  if [ "$public" = "False" ] || [ "$public" = "false" ]; then
    echo "${reason} ashinaga-postgres-${ENVIRONMENT} is not publicly accessible, so the GitHub runner cannot take over." >&2
    exit 1
  fi
  echo "${reason} The database is still public, so this task will run on the GitHub runner."
  exit 42
}

ERR_FILE=$(mktemp)
set +e
PROJECT_JSON=$(aws codebuild batch-get-projects \
  --region "$AWS_REGION" \
  --names "$PROJECT" \
  --output json 2>"$ERR_FILE")
PROJECT_STATUS=$?
set -e
if [ "$PROJECT_STATUS" -ne 0 ]; then
  if grep -qi 'AccessDenied' "$ERR_FILE"; then
    rm -f "$ERR_FILE"
    use_runner_because_database_is_public "The GitHub role cannot describe CodeBuild project ${PROJECT}."
  fi
  cat "$ERR_FILE" >&2
  rm -f "$ERR_FILE"
  exit 1
fi
rm -f "$ERR_FILE"
PROJECT_NAME=$(jq -r '.projects[0].name // empty' <<<"$PROJECT_JSON")

if [ "$PROJECT_NAME" != "$PROJECT" ]; then
  use_runner_because_database_is_public "CodeBuild project ${PROJECT} is not applied yet."
fi

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
ZIP="${WORKDIR}/source.zip"
git archive --format=zip -o "$ZIP" HEAD
KEY="source/${GITHUB_SHA:-manual}-$(date +%s).zip"
aws s3 cp "$ZIP" "s3://${BUCKET}/${KEY}" --region "$AWS_REGION" --only-show-errors

OVERRIDES=$(jq -n \
  --arg env "$ENVIRONMENT" \
  --arg task "$DB_TASK" \
  --arg cidrs "$PRIVATE_CIDRS" \
  --arg email "$STAFF_EMAIL" \
  '[
    {name:"ENVIRONMENT", value:$env, type:"PLAINTEXT"},
    {name:"DB_TASK", value:$task, type:"PLAINTEXT"},
    {name:"PRIVATE_CIDRS", value:$cidrs, type:"PLAINTEXT"},
    {name:"STAFF_EMAIL", value:$email, type:"PLAINTEXT"}
  ]')

BUILD_ID=$(aws codebuild start-build \
  --region "$AWS_REGION" \
  --project-name "$PROJECT" \
  --source-type-override S3 \
  --source-location-override "${BUCKET}/${KEY}" \
  --buildspec-override infra/modules/private_data_plane/buildspec.yml \
  --environment-variables-override "$OVERRIDES" \
  --query 'build.id' \
  --output text)

echo "CodeBuild ${DB_TASK} started: ${BUILD_ID}"

for _ in $(seq 1 140); do
  STATUS=$(aws codebuild batch-get-builds \
    --region "$AWS_REGION" \
    --ids "$BUILD_ID" \
    --query 'builds[0].buildStatus' \
    --output text)
  PHASE=$(aws codebuild batch-get-builds \
    --region "$AWS_REGION" \
    --ids "$BUILD_ID" \
    --query 'builds[0].currentPhase' \
    --output text)
  echo "CodeBuild status: ${STATUS} (${PHASE})"
  case "$STATUS" in
    SUCCEEDED)
      exit 0
      ;;
    FAILED|FAULT|STOPPED|TIMED_OUT)
      aws codebuild batch-get-builds \
        --region "$AWS_REGION" \
        --ids "$BUILD_ID" \
        --query 'builds[0].logs' \
        --output json || true
      exit 1
      ;;
  esac
  sleep 20
done

echo "Timed out waiting for CodeBuild ${BUILD_ID}" >&2
exit 1
