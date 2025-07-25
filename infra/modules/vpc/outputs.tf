output "vpc_id" {
  description = "ID of the default VPC"
  value       = aws_default_vpc.default.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the default VPC"
  value       = aws_default_vpc.default.cidr_block
}

output "subnet_ids" {
  description = "List of subnet IDs in the default VPC"
  value       = data.aws_subnets.default.ids
}
