output "ecr_repository_url" {
  description = "ECR repository URL for the API"
  value       = module.api_ecr.repository_url
}

output "app_runner_service_url" {
  description = "App Runner service URL"
  value       = module.api_app_runner.service_url
}

output "app_runner_service_arn" {
  description = "App Runner service ARN"
  value       = module.api_app_runner.service_arn
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

output "database_name" {
  description = "Database name"
  value       = aws_db_instance.postgres.db_name
}

output "database_username" {
  description = "Database username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}