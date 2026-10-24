# ECR Repository outputs
output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = module.api_ecr.repository_url
}

# App Runner outputs
output "app_runner_service_url" {
  description = "URL of the App Runner service"
  value       = module.api_app_runner.service_url
}

output "app_runner_service_arn" {
  description = "ARN of the App Runner service"
  value       = module.api_app_runner.service_arn
}

output "app_runner_custom_domain" {
  description = "Custom domain URL for the App Runner service"
  value       = "https://${aws_apprunner_custom_domain_association.api.domain_name}"
}

output "app_runner_dns_target" {
  description = "DNS target for the App Runner custom domain (add this as CNAME in Cloudflare)"
  value       = aws_apprunner_custom_domain_association.api.dns_target
}

# Database outputs (sensitive)
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
  description = "Database master username"
  value       = aws_db_instance.postgres.username
  sensitive   = true
}

output "github_actions_db_tasks_policy_arn" {
  description = "Attach to the GitHub OIDC role so deploys can start in-VPC database tasks"
  value       = module.private_data_plane.github_actions_policy_arn
}

output "db_tasks_project_name" {
  description = "CodeBuild project that runs migrations inside the VPC"
  value       = module.private_data_plane.codebuild_project_name
}