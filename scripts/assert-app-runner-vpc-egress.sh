#!/usr/bin/env bash
# Fails the deploy once in-VPC database tasks exist and App Runner is not using them.
# Before the CodeBuild project is applied, this is a no-op so a merge cannot take
# deploys down ahead of terraform apply.
set -euo pipefail

ENVIRONMENT="${1:?environment (test or prod)}"
AWS_REGION="${AWS_REGION:-eu-west-3}"
PROJECT="ashinaga-db-tasks-${ENVIRONMENT}"
SERVICE="ashinaga-api-${ENVIRONMENT}"

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
    echo "GitHub role cannot describe ${PROJECT}. Skipping the VPC egress check until the db-tasks policy is attached."
    rm -f "$ERR_FILE"
    exit 0
  fi
  cat "$ERR_FILE" >&2
  rm -f "$ERR_FILE"
  exit 1
fi
rm -f "$ERR_FILE"
PROJECT_NAME=$(jq -r '.projects[0].name // empty' <<<"$PROJECT_JSON")

if [ "$PROJECT_NAME" != "$PROJECT" ]; then
  echo "CodeBuild project ${PROJECT} is not applied yet. Skipping the VPC egress check."
  exit 0
fi

SERVICE_ARN=$(aws apprunner list-services \
  --region "$AWS_REGION" \
  --query "ServiceSummaryList[?ServiceName=='${SERVICE}'].ServiceArn" \
  --output text)

if [ -z "$SERVICE_ARN" ] || [ "$SERVICE_ARN" = "None" ]; then
  echo "App Runner service ${SERVICE} was not found." >&2
  exit 1
fi

EGRESS=$(aws apprunner describe-service \
  --region "$AWS_REGION" \
  --service-arn "$SERVICE_ARN" \
  --query 'Service.NetworkConfiguration.EgressConfiguration.EgressType' \
  --output text)

echo "App Runner egress for ${SERVICE}: ${EGRESS}"
if [ "$EGRESS" != "VPC" ]; then
  echo "::error::App Runner egress is ${EGRESS}. Database tasks run in the VPC, so this deploy stops until egress is VPC."
  exit 1
fi
