# Create default VPC if it doesn't exist
# This is idempotent - if the VPC already exists, it will just reference it
resource "aws_default_vpc" "default" {
  tags = merge(
    {
      Name        = "Default VPC"
      Environment = var.environment
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
