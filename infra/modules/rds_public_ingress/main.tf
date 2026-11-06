terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

# Reads the live group and chooses the existing public 5432 rule. The root
# module imports that sgr- id. While locked, nothing is looked up and this
# rule is the one removed.
data "aws_vpc_security_group_rules" "rds" {
  count = var.locked ? 0 : 1

  filter {
    name   = "group-id"
    values = [var.security_group_id]
  }
}

data "aws_vpc_security_group_rule" "rds" {
  for_each = toset(var.locked ? [] : data.aws_vpc_security_group_rules.rds[0].ids)

  security_group_rule_id = each.value
}

locals {
  rules = [
    for id, rule in data.aws_vpc_security_group_rule.rds : {
      id           = id
      cidr         = rule.cidr_ipv4
      protocol     = coalesce(rule.ip_protocol, "tcp")
      ingress      = rule.is_egress == false
      port_5432    = rule.from_port == 5432 && rule.to_port == 5432
      touches_5432 = rule.from_port == 5432 || rule.to_port == 5432
      public       = contains(var.cidr_blocks, coalesce(rule.cidr_ipv4, "none"))
    }
  ]

  adopted = [
    for rule in local.rules : rule
    if rule.ingress && rule.public && rule.port_5432
  ]

  adopted_by_cidr = {
    for cidr in var.cidr_blocks : cidr => [
      for rule in local.adopted : rule
      if rule.cidr == cidr
    ]
  }

  adopted_rule_ids = {
    for cidr, rules in local.adopted_by_cidr : cidr => rules[0].id
    if length(rules) == 1
  }

  adopted_protocols = {
    for cidr, rules in local.adopted_by_cidr : cidr => rules[0].protocol
    if length(rules) == 1
  }

  unadopted_rule_ids = [
    for rule in local.rules : rule.id
    if rule.ingress && rule.public && rule.touches_5432 && !contains(values(local.adopted_rule_ids), rule.id)
  ]
}

resource "aws_vpc_security_group_ingress_rule" "rds_public" {
  for_each = var.locked ? toset([]) : toset(var.cidr_blocks)

  security_group_id = var.security_group_id
  cidr_ipv4         = each.value
  from_port         = 5432
  to_port           = 5432
  # Keep the live protocol. Forcing "tcp" over "6" would replace the rule.
  ip_protocol = lookup(local.adopted_protocols, each.value, "tcp")

  lifecycle {
    ignore_changes = [description]
  }
}
