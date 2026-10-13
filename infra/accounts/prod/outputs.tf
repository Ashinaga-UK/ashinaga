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
# ECS outputs
output "api_ecs_cluster" {
  description = "ECS cluster running the API"
  value       = module.api_ecs.cluster_name
}

output "api_ecs_service" {
  description = "ECS service running the API"
  value       = module.api_ecs.service_name
}

output "api_load_balancer_dns_name" {
  description = "CNAME target for api.ashinaga-uk.org in Google Cloud DNS"
  value       = module.api_ecs.load_balancer_dns_name
}

output "api_acm_validation_records" {
  description = "Add these in Google Cloud DNS so the API certificate can be issued"
  value       = module.api_ecs.acm_validation_records
}
