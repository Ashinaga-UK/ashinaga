# Test environment configuration
environment  = "test"
project_name = "ashinaga"
aws_region   = "eu-west-3"

# Database credentials - password managed by AWS Secrets Manager
db_name     = "ashinaga_test"
db_username = "dbadmin"

# Database configuration - same size as playground but production-level security
db_instance_class        = "db.4g.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 100

# Database security - TEMPORARILY OPEN FOR DEBUGGING
db_ingress_cidr_blocks = [
  "0.0.0.0/0" # Allow all IPs for debugging
]
publicly_accessible = true # Temporarily public for debugging

# App Runner configuration - same as playground for test
app_runner_cpu    = "0.25 vCPU"
app_runner_memory = "0.5 GB"
app_runner_port   = 3000

# Test environment settings with some production-like features
enable_deletion_protection = false # Still false for test to allow easy cleanup
backup_retention_period    = 0     # Turn off for test environment
skip_final_snapshot        = true  # Still true for test environment
