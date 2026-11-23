# Test environment configuration
environment  = "test"
project_name = "ashinaga"
aws_region   = "eu-west-3"

# Database credentials - password managed by AWS Secrets Manager
db_name     = "ashinaga_test"
db_username = "dbadmin"

# Database configuration - same size as playground but production-level security
db_instance_class        = "db.t4g.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 100

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
# Test: 172.31.200.0/24 and 172.31.201.0/24.
# Prod: 172.31.210.0/24 and 172.31.211.0/24 (infra/accounts/prod/terraform.tfvars).
# The same pairs are duplicated in scripts/start-db-task.sh.
private_subnet_cidrs         = ["172.31.200.0/24", "172.31.201.0/24"]

# App Runner configuration - same as playground for test
app_runner_cpu    = "0.25 vCPU"
app_runner_memory = "0.5 GB"
app_runner_port   = 4000

# Test environment settings with some production-like features
enable_deletion_protection = false # Still false for test to allow easy cleanup
backup_retention_period    = 0     # Turn off for test environment
skip_final_snapshot        = true  # Still true for test environment
