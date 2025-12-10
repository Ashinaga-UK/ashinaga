provider "aws" {
  region = var.aws_region
}

# ECR Repository for API
module "api_ecr" {
  source = "../../modules/ecr_repository"

  repository_name = "${var.project_name}-api-${var.environment}"
  environment     = var.environment
}

# Database password stored in AWS Secrets Manager
module "db_password" {
  source = "../../modules/secrets_manager"

  secret_name_prefix = "${var.project_name}-db-password-${var.environment}-"
  description        = "Database password for ${var.project_name} ${var.environment} environment"
  environment        = var.environment
  password_length    = 32

  additional_tags = {
    Purpose = "Database"
    Service = "PostgreSQL"
  }
}

# Better Auth secret stored in AWS Secrets Manager
module "better_auth_secret" {
  source = "../../modules/secrets_manager"

  secret_name_prefix = "${var.project_name}-auth-secret-${var.environment}-"
  description        = "Better Auth secret for ${var.project_name} ${var.environment} environment"
  environment        = var.environment
  password_length    = 64 # Longer for auth secret

  additional_tags = {
    Purpose = "Authentication"
    Service = "BetterAuth"
  }
}

# Resend API Key stored in AWS Secrets Manager
module "resend_api_key" {
  source = "../../modules/secrets_manager"

  secret_name_prefix = "${var.project_name}-resend-api-key-${var.environment}-"
  description        = "Resend API key for ${var.project_name} ${var.environment} environment"
  environment        = var.environment
  password_length    = 32

  additional_tags = {
    Purpose = "EmailService"
    Service = "Resend"
  }
}

# S3 Bucket for Scholar Data
module "scholar_data_bucket" {
  source = "../../modules/s3_bucket"

  bucket_name       = "${var.project_name}-scholar-data-${var.environment}"
  environment       = var.environment
  enable_versioning = true
  lifecycle_days    = 90
}

# VPC and networking
module "vpc" {
  source = "../../modules/vpc"

  environment = var.environment
  additional_tags = {
    Project = var.project_name
  }
}

# Security group for RDS - simple configuration
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-${var.environment}-"
  vpc_id      = module.vpc.vpc_id

  # Allow all ingress on 5432 - controlled by terraform.tfvars
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.db_ingress_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-rds-${var.environment}"
    Environment = var.environment
  }
}

# DB subnet group
resource "aws_db_subnet_group" "postgres" {
  name       = "${var.project_name}-db-subnet-group-${var.environment}"
  subnet_ids = module.vpc.subnet_ids

  tags = {
    Name        = "${var.project_name}-db-subnet-group-${var.environment}"
    Environment = var.environment
  }
}

# RDS PostgreSQL instance
resource "aws_db_instance" "postgres" {
  identifier                  = "${var.project_name}-postgres-${var.environment}"
  allocated_storage           = var.db_allocated_storage
  max_allocated_storage       = var.db_max_allocated_storage
  storage_type                = "gp3"
  engine                      = "postgres"
  engine_version              = "17.5"
  instance_class              = var.db_instance_class
  db_name                     = var.db_name
  username                    = var.db_username
  password                    = module.db_password.secret_value
  publicly_accessible         = var.publicly_accessible
  allow_major_version_upgrade = true

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.postgres.name

  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  skip_final_snapshot      = var.skip_final_snapshot
  deletion_protection      = var.enable_deletion_protection
  delete_automated_backups = true # Delete backups immediately on destroy

  # Proper lifecycle management
  lifecycle {
    ignore_changes = [password] # Don't recreate if password changes
  }

  # Add longer timeout for destroy operations
  timeouts {
    create = "40m"
    update = "80m"
    delete = "60m" # Increased to 60 minutes for destroy
  }

  # Ensure proper cleanup order
  depends_on = [
    aws_db_subnet_group.postgres,
    aws_security_group.rds
  ]

  tags = {
    Name        = "${var.project_name}-postgres-${var.environment}"
    Environment = var.environment
  }
}

# Push a Hello World Docker image to ECR only once during initial setup
# This provides a working image for App Runner to start with
# GitHub Actions will push the real API images for subsequent deployments
resource "null_resource" "push_initial_image" {
  depends_on = [module.api_ecr]

  provisioner "local-exec" {
    command = <<-EOT
      set -e  # Exit on any error
      
      # Get repository details
      REPO_URI="${module.api_ecr.repository_url}"
      REGION="${var.aws_region}"
      
      echo "Checking if image already exists in $REPO_URI"
      
      # Check if an image with 'latest' tag already exists
      if aws ecr describe-images --repository-name ${module.api_ecr.repository_name} --region $REGION --image-ids imageTag=latest >/dev/null 2>&1; then
        echo "Image with 'latest' tag already exists in ECR. Skipping Hello World image push."
        echo "This means GitHub Actions or another process has already pushed a real image."
        exit 0
      fi
      
      echo "No 'latest' image found. Building and pushing Hello World API to $REPO_URI"
      
      # Check if Docker is running
      if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker is not running. Please start Docker Desktop."
        exit 1
      fi
      
      # Login to ECR
      echo "Logging in to ECR..."
      aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $REPO_URI
      
      # Navigate to hello-world directory
      cd "${path.module}/../../scripts/hello-world"
      
      # Build the hello world Docker image for linux/amd64 (App Runner requirement)
      echo "Building Hello World API Docker image for linux/amd64..."
      docker build --platform linux/amd64 -t hello-world-api .
      
      echo "Tagging image for ECR..."
      docker tag hello-world-api $REPO_URI:latest
      
      echo "Pushing to ECR..."
      docker push $REPO_URI:latest
      
      echo "SUCCESS: Pushed Hello World API to $REPO_URI:latest"
      
      # Verify the image was pushed
      aws ecr describe-images --repository-name ${module.api_ecr.repository_name} --region $REGION --query 'imageDetails[0].imageTags' --output text
    EOT
  }

  # Only trigger once when ECR repository is created - never rebuild after that
  triggers = {
    ecr_repository_url = module.api_ecr.repository_url
  }
}

# App Runner Service for API
module "api_app_runner" {
  source     = "../../modules/app_runner_service"
  depends_on = [aws_db_instance.postgres, null_resource.push_initial_image]

  service_name     = "${var.project_name}-api-${var.environment}"
  image_identifier = "${module.api_ecr.repository_url}:latest"
  environment      = var.environment
  port             = var.app_runner_port
  cpu              = var.app_runner_cpu
  memory           = var.app_runner_memory

  # S3 access policy for scholar data
  additional_policy_arns = [module.scholar_data_bucket.s3_access_policy_arn]

  env_vars = {
    NODE_ENV    = "production"
    PORT        = tostring(var.app_runner_port)
    DB_HOST     = aws_db_instance.postgres.address
    DB_PORT     = tostring(aws_db_instance.postgres.port)
    DB_NAME     = aws_db_instance.postgres.db_name
    DB_USER     = aws_db_instance.postgres.username
    DB_PASSWORD = module.db_password.secret_value

    # Better Auth Configuration
    BETTER_AUTH_SECRET = module.better_auth_secret.secret_value
    BETTER_AUTH_URL    = "https://api.ashinaga-uk.org"

    # CORS Configuration for production environment
    CORS_ORIGINS = "https://staff.ashinaga-uk.org,https://scholar.ashinaga-uk.org,http://localhost:4001,http://localhost:4002"

    # Email Configuration
    RESEND_API_KEY = module.resend_api_key.secret_value
    EMAIL_FROM     = "noreply@ashinaga-uk.org"

    # Frontend URLs
    STAFF_APP_URL   = "https://staff.ashinaga-uk.org"
    SCHOLAR_APP_URL = "https://scholar.ashinaga-uk.org"

    # S3 Configuration
    S3_BUCKET_NAME = module.scholar_data_bucket.bucket_name
    AWS_REGION     = var.aws_region
  }
}

# App Runner Custom Domain Association
# This creates the association between App Runner and the custom domain
# You'll need to add the CNAME record in your DNS provider (Cloudflare/Route53)
resource "aws_apprunner_custom_domain_association" "api" {
  domain_name = "api.ashinaga-uk.org"
  service_arn = module.api_app_runner.service_arn
}
