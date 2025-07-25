# Playground environment configuration
environment  = "playground"
project_name = "ashinaga"
aws_region   = "eu-west-3"

# Database credentials
db_name     = "ashinaga_db"
db_username = "dbadmin"
db_password = "ashinaga-password-123" # TODO: Use AWS Secrets Manager in production

# Database configuration
db_instance_class        = "db.t3.micro"
db_allocated_storage     = 20
db_max_allocated_storage = 100

# Database security
db_ingress_cidr_blocks = ["0.0.0.0/0"] # Open for playground - restrict in production
publicly_accessible    = true          # TODO: Set to false for production

# App Runner configuration
app_runner_cpu    = "0.25 vCPU"
app_runner_memory = "0.5 GB"
app_runner_port   = 3000

# Development/testing settings
enable_deletion_protection = false
backup_retention_period    = 0
skip_final_snapshot        = true