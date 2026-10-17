variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-west-3"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "test"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ashinaga"
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
  default     = 4000
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
  description = "Whether RDS is publicly accessible while lock_database_network is false. An apply that omits this variable keeps the instance private."
  type        = bool
  default     = false
}

variable "db_ingress_cidr_blocks" {
  description = "CIDR ingress used only while lock_database_network is false. An apply that omits this variable does not open the database to the internet."
  type        = list(string)
  default     = []
}

variable "lock_database_network" {
  description = "Attended second apply. When true, RDS is not publicly accessible and ingress is only the App Runner connector and the in-VPC migration security group. Leave false until sign-in, mail, and S3 have been proven through the VPC connector."
  type        = bool
  default     = false
}

variable "apply_db_changes_immediately" {
  description = "Apply RDS modifications now instead of the Sunday maintenance window. Set true only for the attended lock apply, then set it back to false."
  type        = bool
  default     = false
}

variable "private_subnet_cidrs" {
  description = "Two literal CIDRs inside 172.31.0.0/16, one per availability zone. Do not allocate these at apply time."
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_cidrs) == 2
    error_message = "Provide exactly two private subnet CIDRs."
  }
}

variable "github_actions_role_name" {
  description = "Existing GitHub OIDC role name. When set, the database-task StartBuild policy is attached to it."
  type        = string
  default     = ""
}