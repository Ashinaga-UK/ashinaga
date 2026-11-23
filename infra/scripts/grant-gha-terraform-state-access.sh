#!/usr/bin/env bash
# One-time: let the GitHub Actions OIDC role read/write Terraform state + lockfiles.
# Needed before `Terraform Plan` (and future apply) workflows can use AWS_ROLE_ARN.
#
# Usage (from a principal that can iam:PutRolePolicy on the GHA role):
#   ROLE_NAME=ashinaga-github-actions ./grant-gha-terraform-state-access.sh
#   # or:
#   ./grant-gha-terraform-state-access.sh arn:aws:iam::ACCOUNT:role/ashinaga-github-actions
#
# Re-run is idempotent (overwrites the same inline policy).

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

if ! aws sts get-caller-identity >/dev/null 2>&1; then
  log_error "AWS CLI has no credentials. Run this from a break-glass / admin session (console CloudShell is fine)."
  exit 1
fi

ROLE_INPUT="${1:-${ROLE_NAME:-}}"
if [[ -z "${ROLE_INPUT}" ]]; then
  log_error "Pass the GHA role name or ARN (the role behind GitHub secret AWS_ROLE_ARN)."
  log_error "Example: $0 ashinaga-github-actions"
  exit 1
fi

if [[ "${ROLE_INPUT}" == arn:aws:iam::*:role/* ]]; then
  ROLE_NAME="${ROLE_INPUT##*/}"
else
  ROLE_NAME="${ROLE_INPUT}"
fi

POLICY_NAME="ashinaga-gha-terraform-state"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
REGION="${AWS_REGION:-eu-west-3}"

BUCKETS=(
  "ashinaga-terraform-state-test"
  "ashinaga-terraform-state-prod"
)

RESOURCE_OBJECTS=()
RESOURCE_BUCKETS=()
for b in "${BUCKETS[@]}"; do
  RESOURCE_BUCKETS+=("\"arn:aws:s3:::${b}\"")
  RESOURCE_OBJECTS+=("\"arn:aws:s3:::${b}/*\"")
done

BUCKET_CSV=$(IFS=,; echo "${RESOURCE_BUCKETS[*]}")
OBJECT_CSV=$(IFS=,; echo "${RESOURCE_OBJECTS[*]}")

POLICY_DOC=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListStateBuckets",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketVersioning"],
      "Resource": [${BUCKET_CSV}]
    },
    {
      "Sid": "StateAndLockObjects",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [${OBJECT_CSV}]
    }
  ]
}
EOF
)

log_info "Attaching inline policy ${POLICY_NAME} to role ${ROLE_NAME} (account ${ACCOUNT_ID}, region ${REGION})"
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name "${POLICY_NAME}" \
  --policy-document "${POLICY_DOC}"

log_info "Done. Re-run: gh workflow run terraform-plan.yml --ref <branch> -f environment=test"
