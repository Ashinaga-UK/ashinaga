#!/bin/bash

# Bootstrap script to create S3 bucket for Terraform remote state
# Usage: ./bootstrap-state.sh <environment>
# Example: ./bootstrap-state.sh test

set -e

# Check if environment argument is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <environment>"
    echo "Example: $0 test"
    echo "Available environments: playground, test, prod"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

ENVIRONMENT="$1"

# Validate environment
case "$ENVIRONMENT" in
    playground|test|prod)
        log_info "Bootstrapping state for environment: $ENVIRONMENT"
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        log_error "Valid environments are: playground, test, prod"
        exit 1
        ;;
esac

BUCKET_NAME="ashinaga-terraform-state-${ENVIRONMENT}"
AWS_REGION="eu-west-3"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    log_error "AWS CLI not configured or no valid credentials"
    exit 1
fi

log_info "Creating Terraform remote state infrastructure..."

# Create S3 bucket for state storage
log_info "Creating S3 bucket: $BUCKET_NAME"
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    log_warn "S3 bucket $BUCKET_NAME already exists"
else
    # Create bucket with location constraint for non-us-east-1 regions
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION"
    
    log_info "S3 bucket created successfully"
fi

# Enable versioning on the bucket
log_info "Enabling versioning on S3 bucket..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

# Enable server-side encryption
log_info "Enabling server-side encryption on S3 bucket..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

# Block public access
log_info "Blocking public access on S3 bucket..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        BlockPublicAcls=true,\
IgnorePublicAcls=true,\
BlockPublicPolicy=true,\
RestrictPublicBuckets=true

log_info "Remote state infrastructure setup complete!"
log_info ""
log_info "Next steps:"
log_info "1. Run: terraform init"
log_info "2. Terraform will use the S3 bucket for remote state with lockfile support"
log_info ""
log_info "S3 Bucket: $BUCKET_NAME"