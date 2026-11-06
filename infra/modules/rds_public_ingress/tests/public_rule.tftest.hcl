mock_provider "aws" {
  override_during = plan

  mock_data "aws_vpc_security_group_rules" {
    defaults = {
      ids = ["sgr-0123456789abcdef0"]
    }
  }

  mock_data "aws_vpc_security_group_rule" {
    defaults = {
      cidr_ipv4   = "0.0.0.0/0"
      from_port   = 5432
      to_port     = 5432
      ip_protocol = "6"
      is_egress   = false
    }
  }
}

variables {
  security_group_id = "sg-0123456789abcdef0"
  cidr_blocks       = ["0.0.0.0/0"]
}

run "rejects_a_public_5432_rule_it_cannot_adopt" {
  command = plan

  variables {
    locked = false
  }

  override_data {
    target = module.rds_public_ingress.data.aws_vpc_security_group_rule.rds["sgr-0123456789abcdef0"]
    values = {
      cidr_ipv4   = "0.0.0.0/0"
      from_port   = 5432
      to_port     = 5433
      ip_protocol = "tcp"
      is_egress   = false
    }
  }

  expect_failures = [terraform_data.rds_public_ingress_adoption]
}

run "adopts_the_existing_sgr_id" {
  command = plan

  variables {
    locked = false
  }

  # Mock providers cannot perform imports. Overriding the targeted rule lets
  # the plan prove which sgr- id and protocol were selected.
  override_resource {
    target = module.rds_public_ingress.aws_vpc_security_group_ingress_rule.rds_public["0.0.0.0/0"]
  }

  assert {
    condition     = output.adopted_rule_ids["0.0.0.0/0"] == "sgr-0123456789abcdef0"
    error_message = "The plan did not pick up the existing sgr- id."
  }

  assert {
    condition     = output.public_protocols["0.0.0.0/0"] == "6"
    error_message = "The adopted rule must keep the live protocol so Terraform does not replace it."
  }
}

run "record_the_adopted_rule" {
  command = apply

  variables {
    locked = false
  }

  override_resource {
    target = module.rds_public_ingress.aws_vpc_security_group_ingress_rule.rds_public["0.0.0.0/0"]
  }
}

run "lock_drops_the_public_rule" {
  command = plan

  variables {
    locked = true
  }

  assert {
    condition     = length(output.managed_cidrs) == 0 && length(output.adopted_rule_ids) == 0
    error_message = "Locking must remove the public rule from the configuration."
  }
}
