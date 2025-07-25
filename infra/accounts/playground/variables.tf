variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-west-3"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "playground"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ashinaga"
}

variable "db_password" {
  description = "Database password for RDS PostgreSQL instance"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "ashinaga"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "ashinaga"
}

# Optional variables that can be customized per environment

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instance in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance in GB"
  type        = number
  default     = 100
}

variable "app_runner_cpu" {
  description = "CPU units for App Runner service"
  type        = string
  default     = "0.25 vCPU"
}

variable "app_runner_memory" {
  description = "Memory for App Runner service"
  type        = string
  default     = "0.5 GB"
}

variable "app_runner_port" {
  description = "Port for App Runner service"
  type        = number
  default     = 3000
}

variable "enable_deletion_protection" {
  description = "Enable deletion protection for RDS instance"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 0
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when deleting RDS instance"
  type        = bool
  default     = true
}

variable "publicly_accessible" {
  description = "Whether RDS instance should be publicly accessible"
  type        = bool
  default     = true
}

variable "db_ingress_cidr_blocks" {
  description = "CIDR blocks allowed to connect to the database"
  type        = list(string)
  default     = ["0.0.0.0/0"] # Open to all IPs - should be restricted in production
}