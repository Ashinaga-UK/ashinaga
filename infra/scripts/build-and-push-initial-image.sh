#!/bin/bash

# Script to push a minimal initial Docker image to ECR
# This solves the circular dependency issue between ECR and App Runner

set -e

# Parse command line arguments
ENVIRONMENT=${1:-playground}
AWS_REGION=${2:-eu-west-3}
PROJECT_NAME=${3:-ashinaga}

# Set variables
REPOSITORY_NAME="${PROJECT_NAME}-api-${ENVIRONMENT}"
IMAGE_TAG="initial"

echo "Pushing minimal initial Docker image..."
echo "Repository: ${REPOSITORY_NAME}"
echo "Region: ${AWS_REGION}"
echo "Environment: ${ENVIRONMENT}"

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPOSITORY_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPOSITORY_NAME}"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Creating a minimal placeholder image using public registry..."
    
    # Login to ECR
    echo "Logging in to ECR..."
    aws ecr get-login-password --region ${AWS_REGION} | aws ecr --region ${AWS_REGION} get-login-password | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Pull a minimal Node.js image and retag it
    docker pull node:20-alpine
    docker tag node:20-alpine ${REPOSITORY_URI}:${IMAGE_TAG}
    docker tag node:20-alpine ${REPOSITORY_URI}:latest
    
    # Push the minimal image
    echo "Pushing minimal placeholder image..."
    docker push ${REPOSITORY_URI}:${IMAGE_TAG}
    docker push ${REPOSITORY_URI}:latest
    
    echo "Successfully pushed minimal placeholder image. Deploy your actual application via GitHub Actions."
    exit 0
fi

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${REPOSITORY_URI}

# Navigate to the project root (assuming script is run from infra/scripts/)
cd "$(dirname "$0")/../.."

# Build the Docker image
echo "Building Docker image..."
docker build -t ${REPOSITORY_NAME}:${IMAGE_TAG} -f apps/api/Dockerfile .

# Tag the image for ECR
docker tag ${REPOSITORY_NAME}:${IMAGE_TAG} ${REPOSITORY_URI}:${IMAGE_TAG}
docker tag ${REPOSITORY_NAME}:${IMAGE_TAG} ${REPOSITORY_URI}:latest

# Push the image
echo "Pushing Docker image to ECR..."
docker push ${REPOSITORY_URI}:${IMAGE_TAG}
docker push ${REPOSITORY_URI}:latest

echo "Successfully pushed initial image to ${REPOSITORY_URI}:latest"