# Create default VPC if it doesn't exist
# This is idempotent - if the VPC already exists, it will just reference it
# No Environment tag: test and prod share the account's default VPC, so each
# stack would otherwise overwrite the other's tag on every apply.
resource "aws_default_vpc" "default" {
  tags = merge(
    {
      Name = "Default VPC"
    },
    var.additional_tags
  )
}

# Get default subnets (will be created with the default VPC)
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [aws_default_vpc.default.id]
  }

  depends_on = [aws_default_vpc.default]
}
