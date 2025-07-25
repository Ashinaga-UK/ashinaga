# Infrastructure Deployment Guide

This guide walks you through setting up the complete infrastructure for the Ashinaga project on AWS.

> **📝 Note**: This guide uses `playground` as the example environment throughout all commands. Replace `playground` with your target environment (`test`, `prod`) as appropriate. Available environments: `playground`, `test`, `prod`.

## Prerequisites

Before starting, ensure you have:

- **AWS CLI** installed and configured
- **Terraform** >= 1.2 installed
- **Docker Desktop** running (for initial image build)
- **pnpm** package manager installed

## Architecture Overview

The infrastructure consists of:

- **ECR Repository** - Stores Docker images for the API
- **RDS PostgreSQL** - Database for the application
- **App Runner Service** - Runs the containerized API with auto-scaling
- **S3 Bucket** - Remote Terraform state storage with encryption
- **Security Groups** - Network access controls for database

## Step 1: Configure AWS Profile

Set up your AWS profile for the target environment:

```bash
aws configure --profile playground
# Enter your AWS Access Key ID, Secret, and region (eu-west-3)
```

Verify the configuration:
```bash
AWS_PROFILE=playground aws sts get-caller-identity
```

## Step 2: Bootstrap Remote State

Create the S3 bucket for Terraform remote state:

```bash
cd infra/scripts
AWS_PROFILE=playground ./bootstrap-state.sh playground
```

This script will:
- Create S3 bucket `ashinaga-terraform-state-playground`
- Enable versioning and encryption
- Configure proper security settings

## Step 3: Initialize Terraform

Navigate to the playground environment:

```bash
cd infra/accounts/playground
AWS_PROFILE=playground terraform init
```

Terraform will automatically configure the S3 backend for remote state management.

## Step 4: Review and Apply Infrastructure

Review the infrastructure plan:

```bash
AWS_PROFILE=playground terraform plan
```

Apply the infrastructure:

```bash
AWS_PROFILE=playground terraform apply
```

This will create:
1. **ECR Repository** for Docker images
2. **Hello World Image** (bootstrap only - won't overwrite real deployments)
3. **RDS PostgreSQL Database** with proper timeouts and lifecycle management
4. **App Runner Service** with database environment variables
5. **Security Groups** and networking

## Step 5: Verify Deployment

After deployment completes, check the outputs:

```bash
AWS_PROFILE=playground terraform output
```

You should see:
- `app_runner_service_url` - Your API endpoint
- `ecr_repository_url` - Docker registry URL
- `database_endpoint` - RDS endpoint (sensitive)

Test the Hello World API:
```bash
curl $(terraform output -raw app_runner_service_url)
```

## Important Configuration Details

### Remote State Management

- **Backend**: S3 with `use_lockfile = true`
- **Encryption**: Enabled with AES256
- **Versioning**: Enabled for state recovery
- **No DynamoDB**: Uses modern lockfile approach

### Database Configuration

- **Engine**: PostgreSQL 15.7
- **Instance**: db.t3.micro (suitable for development)
- **Backup**: Disabled for faster deletion (`backup_retention_period = 0`)
- **Deletion Protection**: Disabled for easy cleanup
- **Timeouts**: Extended (60min delete) to prevent stuck operations

### App Runner Configuration

- **Auto Deployment**: Enabled - automatically deploys when new images are pushed
- **CPU/Memory**: 0.25 vCPU / 0.5 GB (adjustable)
- **Health Checks**: TCP on port 3000
- **Environment Variables**: Database connection details

### Image Management

- **Bootstrap Image**: Hello World API for initial setup
- **Smart Deployment**: Only pushes Hello World if no `:latest` image exists
- **GitHub Actions**: Handles real API deployments
- **Architecture**: linux/amd64 (App Runner requirement)

## Cleanup

To destroy the infrastructure:

```bash
AWS_PROFILE=playground terraform destroy
```

**Note**: Cleanup includes extended timeouts to handle RDS deletion properly.

## Troubleshooting

### Common Issues

1. **Docker not running**: Ensure Docker Desktop is running before applying
2. **ECR login issues**: Check AWS credentials and region configuration
3. **App Runner deployment failures**: Verify image architecture is linux/amd64
4. **Database deletion timeouts**: Extended timeouts are configured, but may take up to 60 minutes
5. **Missing default VPC**: Fresh AWS accounts may not have a default VPC - our VPC module automatically creates one

### State Issues

If you encounter state drift:

```bash
# Refresh state to detect changes
AWS_PROFILE=playground terraform refresh

# Import existing resources if needed
AWS_PROFILE=playground terraform import aws_db_instance.postgres <instance-id>
```

### App Runner Status

Check App Runner service status:
```bash
AWS_PROFILE=playground aws apprunner describe-service --service-arn <service-arn>
```

## Multi-Environment Setup

### Available Environments

- **playground** - Development environment with relaxed security (publicly accessible DB)
- **test** - Production-like security with smaller resources (private DB, AWS Secrets Manager)
- **prod** - Full production configuration (to be created)

### Environment-Specific Commands

For **test** environment:
```bash
# Bootstrap state
AWS_PROFILE=test ./bootstrap-state.sh test

# Deploy infrastructure
cd infra/accounts/test
AWS_PROFILE=test terraform init
AWS_PROFILE=test terraform plan
AWS_PROFILE=test terraform apply
```

For **prod** environment:
```bash
# Bootstrap state
AWS_PROFILE=prod ./bootstrap-state.sh prod

# Deploy infrastructure
cd infra/accounts/prod
AWS_PROFILE=prod terraform init
AWS_PROFILE=prod terraform plan
AWS_PROFILE=prod terraform apply
```

### Key Differences Between Environments

| Feature | Playground | Test | Production |
|---------|------------|------|------------|
| Database Access | Public | Private | Private |
| Password Management | Variables | AWS Secrets Manager | AWS Secrets Manager |
| Backup Retention | 0 days | 1 day | 7+ days |
| Deletion Protection | Disabled | Disabled | Enabled |
| Resource Size | t3.micro | t3.micro | Larger instances |

## Security Considerations

### Environment-Specific Security

**Playground Environment:**
- Database publicly accessible for easy development
- Database password in Terraform variables
- Open security group rules (`0.0.0.0/0`)

**Test Environment:**
- Database is private (`publicly_accessible = false`)
- AWS Secrets Manager for password management
- Restricted security group rules (`10.0.0.0/8`)
- Production-like security with smaller resources

**Production Environment:**
- Will use same security model as test
- Larger instance sizes and enhanced backup policies
- Additional monitoring and alerting

### General Security Features

- **IAM**: App Runner uses minimal required permissions for ECR access
- **Encryption**: S3 state bucket uses AES256 encryption
- **Network**: Security groups control database access
- **Secrets**: Sensitive outputs marked appropriately in Terraform

## Next Steps

After infrastructure is deployed:

1. **Database Migrations**: Run via GitHub Actions or manually with Drizzle
2. **API Deployment**: Push code to trigger GitHub Actions deployment
3. **Monitoring**: Set up CloudWatch logs and metrics
4. **Domain**: Configure custom domain for App Runner service
5. **SSL**: Enable HTTPS (handled automatically by App Runner)

## What We Fixed

### 1. Terraform Idempotency ✅
- **Problem**: State drift and non-idempotent operations
- **Solution**: Remote S3 state with lockfile, proper resource lifecycle management, extended timeouts

### 2. Circular Dependency ✅
- **Problem**: App Runner needed Docker image, but ECR needed to exist first
- **Solution**: Bootstrap Hello World image that only deploys if ECR is empty

### 3. Database Infrastructure ✅
- **Problem**: Missing database and migration support
- **Solution**: RDS PostgreSQL with Drizzle migrations in GitHub Actions

### 4. Architecture Issues ✅
- **Problem**: Docker images had wrong architecture causing "exec format error"
- **Solution**: Force linux/amd64 builds for App Runner compatibility

### 5. VPC and Networking ✅
- **Problem**: Fresh AWS accounts missing default VPC causing "no matching EC2 VPC found" errors
- **Solution**: Created reusable VPC module that automatically creates default VPC if missing

## Support

For issues with this deployment:

1. Check AWS CloudWatch logs for App Runner service
2. Verify Terraform state consistency
3. Ensure all prerequisites are installed and configured
4. Check GitHub Actions logs for deployment issues