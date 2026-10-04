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

# Database security - Open for debugging (should be restricted later)
db_ingress_cidr_blocks = ["0.0.0.0/0"] # Allow all IPs temporarily
publicly_accessible    = true          # Publicly accessible for debugging

# App Runner configuration - Production sizing
app_runner_cpu    = "0.5 vCPU" # Peak CPU ~19% of 1 vCPU
app_runner_memory = "1 GB"     # Peak memory ~120MB
app_runner_port   = 4000

# Production environment settings
enable_deletion_protection = true  # Enable deletion protection for production
backup_retention_period    = 7     # 7 days backup retention
skip_final_snapshot        = false # Create final snapshot on deletion
