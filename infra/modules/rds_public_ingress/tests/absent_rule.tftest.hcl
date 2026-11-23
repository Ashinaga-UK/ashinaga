mock_provider "aws" {
  override_during = plan

  mock_data "aws_vpc_security_group_rules" {
    defaults = {
      ids = []
    }
  }
}

variables {
  security_group_id = "sg-0123456789abcdef0"
  cidr_blocks       = ["0.0.0.0/0"]
  locked            = false
}

run "creates_a_rule_only_when_none_exists" {
  command = plan

  assert {
    condition     = length(output.adopted_rule_ids) == 0 && output.public_protocols["0.0.0.0/0"] == "tcp"
    error_message = "A group with no public 5432 rule should get one new tcp rule and adopt nothing."
  }
}
