# Production environment configuration
environment  = "prod"
project_name = "ashinaga"
aws_region   = "eu-west-3"

# Database credentials - password managed by AWS Secrets Manager
db_name     = "ashinaga_prod"
db_username = "dbadmin"

# Database configuration - Production sizing for Customer Data Platform
db_instance_class        = "db.t4g.small" # 2 vCPU, 2GB RAM (Graviton); avg CPU ~4%, <20 connections
db_allocated_storage     = 100            # 100GB initial storage
db_max_allocated_storage = 1000           # Up to 1TB auto-scaling

# Stays reachable from the internet until the attended lock apply.
# That apply sets lock_database_network and apply_db_changes_immediately to true,
# after the VPC connector and CodeBuild task have been proven. Then set
# apply_db_changes_immediately back to false. Do not set storage_encrypted here.
lock_database_network        = false
apply_db_changes_immediately = false
db_ingress_cidr_blocks       = ["0.0.0.0/0"]
publicly_accessible          = true
# CONFIRM before apply. Live subnet CIDRs could not be read from this machine,
# so these blocks assume the standard default VPC 172.31.0.0/16.
# Test: 172.31.200.0/24 and 172.31.201.0/24 (infra/accounts/test/terraform.tfvars).
# Prod: 172.31.210.0/24 and 172.31.211.0/24.
# The same pairs are duplicated in scripts/start-db-task.sh.
private_subnet_cidrs         = ["172.31.210.0/24", "172.31.211.0/24"]

# App Runner configuration - Production sizing
app_runner_cpu    = "0.5 vCPU" # Peak CPU ~19% of 1 vCPU
app_runner_memory = "1 GB"     # Peak memory ~120MB
app_runner_port   = 4000

# Production environment settings
enable_deletion_protection = true  # Enable deletion protection for production
backup_retention_period    = 7     # 7 days backup retention
skip_final_snapshot        = false # Create final snapshot on deletion
