variable "service_name" {
  description = "Name used for the cluster, service, load balancer and IAM roles (e.g. ashinaga-api-prod)"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. test, prod)"
  type        = string
}

variable "image" {
  description = "Container image, including tag. CI pushes new images to this tag and forces a new deployment."
  type        = string
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
}

variable "cpu" {
  description = "Fargate task CPU units (256, 512, 1024, ...)"
  type        = number
}

variable "memory" {
  description = "Fargate task memory in MiB"
  type        = number
}

variable "desired_count" {
  description = "Number of tasks to run"
  type        = number
  default     = 1
}

variable "health_check_path" {
  description = "Path the load balancer uses to check task health"
  type        = string
  default     = "/health"
}

variable "domain_name" {
  description = "Custom domain served by the load balancer (e.g. api.ashinaga-uk.org)"
  type        = string
}

variable "vpc_id" {
  description = "VPC to run the service in"
  type        = string
}

variable "subnet_ids" {
  description = "Public subnets for the load balancer and tasks (at least two AZs)"
  type        = list(string)
}

variable "env_vars" {
  description = "Plain environment variables for the container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Environment variables injected from Secrets Manager: name => secret ARN"
  type        = map(string)
  default     = {}
}

variable "task_policy_arns" {
  description = "IAM policy ARNs the application itself needs (e.g. S3 access)"
  type        = list(string)
  default     = []
}

variable "log_retention_days" {
  description = "CloudWatch log retention for container logs"
  type        = number
  default     = 30
}

variable "deploy_role_name" {
  description = "IAM role used by CI to roll out new images (gets UpdateService/DescribeServices on this service only). Null to skip."
  type        = string
  default     = null
}
