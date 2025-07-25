# Infrastructure Changelog

All notable changes to the infrastructure configuration will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Production Environment Infrastructure** (`infra/accounts/prod/`):
  - Complete production environment with enterprise-level security
  - Separate S3 backend for state isolation (`ashinaga-terraform-state-prod`)
  - Production-sized resources for Customer Data Platform workloads
  - Custom domain support with App Runner custom domain association (api.ashinaga.com)
  - Enhanced database configuration with production-level sizing (db.t3.medium, 100GB-1TB storage)
- **Test Environment Infrastructure** (`infra/accounts/test/`):
  - Complete test environment with production-level security
  - Separate S3 backend for state isolation (`ashinaga-terraform-state-test`)
  - Production-like configuration with smaller resource sizing
- **AWS Secrets Manager Module** (`infra/modules/secrets_manager/`):
  - Reusable module for managing secrets across environments
  - Auto-generates secure 32-character passwords
  - Configurable KMS encryption and recovery windows
  - Proper tagging and lifecycle management
- **VPC Module** (`infra/modules/vpc/`):
  - Reusable module for default VPC management across environments
  - Handles AWS accounts with or without default VPC
  - Returns VPC ID, subnet IDs, and subnet details
  - Consistent networking setup for all environments
- **GitHub Actions Multi-Environment Support**:
  - Branch-based deployment triggers (test → test env, main → prod env)
  - Environment-specific AWS IAM roles and secrets
  - Dynamic environment determination logic
- Created modular Terraform configuration structure:
  - `variables.tf` - Centralized variable definitions
  - `terraform.tfvars` - Environment-specific values
  - `outputs.tf` - Separated output definitions
- New configurable variables:
  - `db_ingress_cidr_blocks` - Control database access (security improvement)
  - `db_name` and `db_username` - Separate database credentials
  - `db_instance_class`, `db_allocated_storage`, `db_max_allocated_storage` - RDS sizing
  - `app_runner_cpu`, `app_runner_memory`, `app_runner_port` - App Runner configuration
  - `enable_deletion_protection`, `backup_retention_period`, `skip_final_snapshot` - Safety controls

### Changed
- **Database Access Configuration**: Temporarily made database publicly accessible for debugging and migrations
  - `publicly_accessible = true` in production and test environments
  - Open CIDR blocks (`0.0.0.0/0`) for database ingress during development phase
- **Security Groups Optimization**: Removed unnecessary lifecycle management rules from test environment
  - Simplified `create_before_destroy` lifecycle rules in test RDS security groups
  - Streamlined DB subnet group configuration
- **Secrets Manager Password Generation**: Enhanced password character restrictions
  - Excluded RDS-incompatible characters ('/', '@', '"', ' ') from generated passwords
  - Updated `override_special` parameter for better database compatibility
- **GitHub Actions Workflow**: Minor deployment logging improvements
  - Updated database connection logging message formatting
- Refactored `main.tf` to use variables instead of hardcoded values
- Database security group now uses configurable CIDR blocks
- All RDS and App Runner settings now configurable per environment
- **GitHub Actions workflow** updated for multi-environment deployments
- **Database password management** moved from hardcoded values to AWS Secrets Manager

### Security
- **Major Security Improvements**:
  - Database passwords now managed by AWS Secrets Manager (no hardcoded secrets)
  - Production environment with enterprise-level security configuration
  - Custom domain SSL termination through App Runner
  - Environment-specific IAM roles for GitHub Actions
- **Temporary Security Configuration** (for development/debugging):
  - Database temporarily made publicly accessible in all environments
  - Open CIDR blocks for database access during migration and development phase
  - **Note**: These settings should be restricted before production launch
- Database password marked as sensitive in variables
- Added ability to restrict database access by IP/CIDR

### Infrastructure
- **Production Environment Specs**:
  - Enterprise-level sizing (db.t3.medium, 2 vCPU, 4GB RAM for CDP workloads)
  - 100GB-1TB auto-scaling storage for Customer Data Platform
  - 7-day backup retention with deletion protection enabled
  - Custom domain integration (api.ashinaga.com)
  - Enhanced App Runner configuration (1 vCPU, 2GB RAM)
- **Test Environment Specs**:
  - Same resource sizing as playground (cost-effective testing)
  - Production-level security and network isolation
  - 1-day backup retention (production-like features)
  - Separate state management for environment isolation
- **VPC and Network Improvements**:
  - App Runner VPC connector integration for private database access
  - Enhanced security group configurations
  - Optimized network access patterns between services

## [1.0.0] - 2025-01-24

### Initial Release
- Basic infrastructure setup with hardcoded values
- ECR repository for API
- RDS PostgreSQL database
- AWS App Runner service
- Remote state configuration