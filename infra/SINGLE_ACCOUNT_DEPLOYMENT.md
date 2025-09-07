# Deploying Test and Production to a Single AWS Account

This guide explains how to deploy both test and production environments to a single AWS account.

## Quick Start

### Prerequisites
- AWS CLI installed and configured
- Terraform installed (>= 1.2)
- Docker Desktop running
- Single AWS account with appropriate permissions

### Step 1: Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region (eu-west-3)
```

### Step 2: Deploy Test Environment
```bash
# Bootstrap state storage for test
cd infra/scripts
./bootstrap-state.sh test

# Deploy test infrastructure
cd ../accounts/test
terraform init
terraform plan
terraform apply
```

### Step 3: Deploy Production Environment
```bash
# Bootstrap state storage for production
cd ../../scripts
./bootstrap-state.sh prod

# Deploy production infrastructure
cd ../accounts/prod
terraform init
terraform plan
terraform apply
```

## Architecture Overview

Both environments are isolated through:
- **Separate VPCs**: Each environment has its own VPC
- **Resource Naming**: All resources are prefixed with environment name
- **Separate State Files**: Each environment has its own Terraform state in S3
- **Independent Deployments**: Can deploy/destroy environments independently

## Resource Naming Convention

| Resource | Test | Production |
|----------|------|------------|
| ECR Repository | ashinaga-api-test | ashinaga-api-prod |
| RDS Database | ashinaga-postgres-test | ashinaga-postgres-prod |
| App Runner | ashinaga-api-test | ashinaga-api-prod |
| S3 State Bucket | ashinaga-terraform-state-test | ashinaga-terraform-state-prod |

## Cost Optimization

### Test Environment
- db.t3.micro RDS instance (db.4g.micro in tfvars needs correction)
- 0.25 vCPU / 0.5 GB App Runner
- Minimal backup retention (0 days)
- Can be destroyed when not in use

### Production Environment
- db.t3.medium RDS instance
- 1 vCPU / 2 GB App Runner
- 7-day backup retention
- Deletion protection enabled

## Managing Environments

### Checking Resource Status
```bash
# List all resources in test
cd infra/accounts/test
terraform state list

# List all resources in production
cd infra/accounts/prod
terraform state list
```

### Updating an Environment
```bash
cd infra/accounts/<environment>
terraform plan
terraform apply
```

### Destroying Test Environment (to save costs)
```bash
cd infra/accounts/test
terraform destroy
```

### Important Notes
1. **Never destroy production** without proper backups
2. **Test has public database** for debugging (as configured)
3. **Production has public database** for debugging (as configured)
4. Each environment has its own domain:
   - Test: api-test.ashinaga-uk.org
   - Production: api.ashinaga-uk.org

## CI/CD Integration

Your GitHub Actions workflows should deploy to the appropriate environment based on branch:
- `test` branch → Test environment
- `main` branch → Production environment

## Monitoring Costs

Use AWS Cost Explorer with the following filters:
- Tag: `Environment = test` or `Environment = prod`
- Tag: `Project = ashinaga`

This helps track costs per environment even though they're in the same account.

## Troubleshooting

### If deployment fails
1. Check AWS credentials: `aws sts get-caller-identity`
2. Ensure Docker is running for initial image push
3. Check Terraform state: `terraform refresh`

### To check App Runner logs
```bash
# For test
aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='ashinaga-api-test']"

# For production
aws apprunner list-services --query "ServiceSummaryList[?ServiceName=='ashinaga-api-prod']"
```