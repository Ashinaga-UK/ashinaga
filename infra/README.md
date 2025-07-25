# Infrastructure as Code Monorepo Layout

This directory contains all infrastructure-as-code (IaC) for the project, following a modular, scalable, and discoverable structure suitable for monorepos.

---

## ✅ Recommended Terraform Layout

```
/infra                     # All Terraform + infra as code
  ├── /accounts            # Account-specific infra (per environment)
  │     ├── prod/
  │     ├── test/
  │     └── playground/
  ├── /modules             # Reusable TF modules (e.g. VPC, ECS, S3, etc.)
  ├── /global              # Infra shared across environments (e.g. org, DNS)
  ├── /scripts             # Wrapper scripts (e.g. init/apply helpers)
  ├── CHANGELOG.md         # Infrastructure change history
  └── DEPLOYMENT_GUIDE.md  # Detailed deployment instructions
```

---

## 💡 Highlights

- **`infra/accounts`**: Environment-specific infrastructure. Each subfolder (e.g., `prod`, `test`) contains its own Terraform configuration (`main.tf`, `terraform.tf`, `variables.tf`, `terraform.tfvars`, `outputs.tf`).
- **`infra/modules`**: Custom reusable Terraform modules for common infrastructure patterns (e.g., VPC, ECS, S3).
- **`infra/global`**: Shared infrastructure provisioned once per organization, such as:
  - AWS Control Tower integrations
  - IAM Identity Center permission sets
  - DNS zones
- **`infra/scripts`**: Shell scripts and helpers for:
  - State bootstrapping
  - CI/CD pipeline steps
  - Developer tooling
- **`infra/CHANGELOG.md`**: Documents all infrastructure changes with dates and details
- **`infra/DEPLOYMENT_GUIDE.md`**: Step-by-step deployment instructions for all environments

---

---

## 🚀 Getting Started

### Prerequisites

1. **Install AWS CLI**
   ```bash
   # macOS (using Homebrew)
   brew install awscli
   
   # Linux
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # Windows
   # Download from: https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

2. **Install Terraform**
   ```bash
   # macOS (using Homebrew)
   brew install terraform
   
   # Linux/Windows: Download from https://terraform.io/downloads
   ```

### AWS Credentials Setup

#### Option 1: Single Profile (Simple)
```bash
aws configure
```
Enter your credentials:
- **AWS Access Key ID**: Get from AWS Console → IAM → Users → [Your User] → Security credentials
- **AWS Secret Access Key**: Generated with the Access Key
- **Default region**: `eu-west-3`
- **Default output format**: `json`

#### Option 2: Multiple Profiles (Recommended)
```bash
# Setup playground environment
aws configure --profile playground
# Use playground account credentials

# Setup test environment
aws configure --profile test
# Use test account credentials

# Setup production environment  
aws configure --profile prod
# Use production account credentials
```

#### Where to Get AWS Credentials

1. **Log into AWS Console**
2. **Go to IAM → Users**
3. **Select your user**
4. **Security credentials tab**
5. **Create access key** → Command Line Interface (CLI)
6. **Copy the Access Key ID and Secret Access Key**

⚠️ **Security Note**: Never commit AWS credentials to git. The `.aws/` directory is automatically ignored.

### Deploy Infrastructure

#### First-Time Setup (Per Environment)

```bash
# Navigate to environment
cd infra/accounts/playground

# Initialize Terraform (downloads providers/modules)
terraform init

# Review planned changes
terraform plan

# Apply infrastructure changes
terraform apply
```

#### Using AWS Profiles

If you set up multiple profiles, specify which one to use:

```bash
# Using AWS_PROFILE environment variable
AWS_PROFILE=playground terraform apply

# Or export it for the session
export AWS_PROFILE=playground
terraform apply
```

### What Gets Created

The playground deployment creates:
- **ECR Repository**: `ashinaga-api-playground` (stores Docker images)
- **RDS PostgreSQL Database**: `ashinaga-postgres-playground` (application data)
- **App Runner Service**: `ashinaga-api-playground` (runs your API)
- **IAM Roles**: Service execution roles
- **Security Groups**: Database access control
- **CloudWatch Logs**: Application logs

### Making Infrastructure Changes

See [CHANGELOG.md](./CHANGELOG.md) for a history of all infrastructure changes.

### Deployment Workflow

1. **One-time**: Run `terraform apply` to create infrastructure
2. **Every deploy**: GitHub Action builds Docker image → pushes to ECR → updates App Runner
3. **Infrastructure changes**: Modify Terraform → run `terraform apply`

---

## 🛠 Example Workflow

- `cd infra/accounts/playground && terraform apply` → Deploy the playground environment
- `cd infra/accounts/prod && terraform apply` → Deploy the production environment stack
- `cd infra/global && terraform apply` → Apply shared, org-wide infrastructure
- `cd infra/modules/vpc && terraform test` → Unit test a reusable module

---

## 🔧 Troubleshooting

### Common Issues

**"No valid credential sources found"**
- Run `aws configure` to set up credentials
- Check `aws sts get-caller-identity` to verify credentials work

**"Repository does not exist" (ECR)**
- Run `terraform apply` first to create the ECR repository
- The GitHub Action needs existing infrastructure to deploy to

**"Access Denied" errors**
- Ensure your AWS user has the necessary IAM permissions
- Check that you're using the correct AWS profile/account