terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

variable "security_group_id" {
  type = string
}

variable "cidr_blocks" {
  type = list(string)
}

variable "locked" {
  type = bool
}

module "rds_public_ingress" {
  source = "../"

  security_group_id = var.security_group_id
  cidr_blocks       = var.cidr_blocks
  locked            = var.locked
}

import {
  for_each = module.rds_public_ingress.adopted_rule_ids
  to       = module.rds_public_ingress.aws_vpc_security_group_ingress_rule.rds_public[each.key]
  id       = each.value
}

output "adopted_rule_ids" {
  value = module.rds_public_ingress.adopted_rule_ids
}

output "managed_cidrs" {
  value = module.rds_public_ingress.managed_cidrs
}

output "public_protocols" {
  value = module.rds_public_ingress.public_protocols
}

resource "terraform_data" "rds_public_ingress_adoption" {
  lifecycle {
    precondition {
      condition     = var.locked || length(module.rds_public_ingress.duplicate_public_cidrs) == 0
      error_message = "More than one public 5432 rule matches a configured CIDR. Refusing to guess which sgr- id to adopt."
    }

    precondition {
      condition     = var.locked || length(module.rds_public_ingress.unadopted_rule_ids) == 0
      error_message = "A public 5432 rule on this security group was not adopted into rds_public. Refusing to create a second one."
    }
  }
}
