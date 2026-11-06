output "adopted_rule_ids" {
  description = "CIDR to the existing sgr- id adopted for that CIDR. Empty when the group has no public 5432 rule yet."
  value       = local.adopted_rule_ids
}

output "managed_cidrs" {
  description = "CIDRs of the public rule while the database is unlocked. Empty once it is locked."
  value       = keys(aws_vpc_security_group_ingress_rule.rds_public)
}

output "public_protocols" {
  description = "Protocol kept for each public rule. Matches the live rule when one was adopted."
  value       = { for cidr, rule in aws_vpc_security_group_ingress_rule.rds_public : cidr => rule.ip_protocol }
}

output "unadopted_rule_ids" {
  description = "Public 5432 rules on the group that were not adopted. The root module refuses to plan when this is not empty."
  value       = local.unadopted_rule_ids
}

output "duplicate_public_cidrs" {
  description = "Configured CIDRs that match more than one public 5432 rule."
  value       = [for cidr, rules in local.adopted_by_cidr : cidr if length(rules) > 1]
}
