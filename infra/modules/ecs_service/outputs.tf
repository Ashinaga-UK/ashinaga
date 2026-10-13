output "cluster_name" {
  description = "ECS cluster name (used by the deploy workflow)"
  value       = aws_ecs_cluster.this.name
}

output "service_name" {
  description = "ECS service name (used by the deploy workflow)"
  value       = aws_ecs_service.this.name
}

output "load_balancer_dns_name" {
  description = "Point the custom domain's CNAME here"
  value       = aws_lb.this.dns_name
}

output "acm_validation_records" {
  description = "DNS records to add in Google Cloud DNS so ACM can issue the certificate"
  value = [for o in aws_acm_certificate.this.domain_validation_options : {
    name  = o.resource_record_name
    type  = o.resource_record_type
    value = o.resource_record_value
  }]
}

output "log_group_name" {
  description = "CloudWatch log group for container logs"
  value       = aws_cloudwatch_log_group.this.name
}
