variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr_block" {
  description = "CIDR of the shared default VPC. Private CIDRs below were reserved inside 172.31.0.0/16."
  type        = string
}

variable "public_subnet_ids" {
  description = "Default public subnet IDs. The NAT gateway is placed in one of these. Their route table is not modified."
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "Two literal CIDRs, one per availability zone. Do not allocate these with cidrsubnet()."
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_cidrs) == 2
    error_message = "Provide exactly two private subnet CIDRs."
  }
}

variable "create_s3_gateway_endpoint" {
  description = "True only for the stack that owns the single S3 gateway endpoint in the shared default VPC. A VPC can have one gateway endpoint per service."
  type        = bool
}

variable "github_actions_role_name" {
  description = "Existing GitHub OIDC role to grant StartBuild. Empty creates the policy and does not attach it."
  type        = string
  default     = ""
}

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_subnet" "public" {
  for_each = toset(var.public_subnet_ids)
  id       = each.value
}

data "aws_subnets" "existing" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }
}

data "aws_subnet" "existing" {
  for_each = toset(data.aws_subnets.existing.ids)
  id       = each.value
}

locals {
  private_azs          = slice(sort(data.aws_availability_zones.available.names), 0, 2)
  public_subnet_by_az  = { for s in data.aws_subnet.public : s.availability_zone => s.id }
  nat_public_subnet_id = local.public_subnet_by_az[local.private_azs[0]]
  codebuild_project    = "${var.project_name}-db-tasks-${var.environment}"
  db_tasks_bucket      = "${var.project_name}-db-tasks-${var.environment}"
  private_subnet_names = [for i in range(2) : "${var.project_name}-private-${var.environment}-${i}"]
}

resource "aws_subnet" "private" {
  count = 2

  vpc_id                  = var.vpc_id
  cidr_block              = var.private_subnet_cidrs[count.index]
  availability_zone       = local.private_azs[count.index]
  map_public_ip_on_launch = false

  tags = {
    Name        = local.private_subnet_names[count.index]
    Environment = var.environment
    Purpose     = "Private egress for App Runner and database tasks"
  }

  lifecycle {
    precondition {
      condition     = var.vpc_cidr_block == "172.31.0.0/16"
      error_message = "Private CIDRs were reserved inside the standard default VPC 172.31.0.0/16, but this VPC is ${var.vpc_cidr_block}. Choose new literal CIDRs before creating subnets."
    }

    precondition {
      condition     = length(data.aws_availability_zones.available.names) >= 2
      error_message = "The App Runner connector needs two availability zones."
    }

    precondition {
      condition = alltrue([
        for s in data.aws_subnet.existing :
        s.cidr_block != var.private_subnet_cidrs[count.index] || try(s.tags["Name"], "") == local.private_subnet_names[count.index]
      ])
      error_message = "CIDR ${var.private_subnet_cidrs[count.index]} is already used by a subnet that this stack does not own."
    }
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "${var.project_name}-nat-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "this" {
  allocation_id = aws_eip.nat.id
  subnet_id     = local.nat_public_subnet_id

  tags = {
    Name        = "${var.project_name}-nat-${var.environment}"
    Environment = var.environment
  }

  lifecycle {
    precondition {
      condition     = contains(keys(local.public_subnet_by_az), local.private_azs[0])
      error_message = "No default public subnet in ${local.private_azs[0]} for the NAT gateway."
    }
  }
}

resource "aws_route_table" "private" {
  vpc_id = var.vpc_id

  tags = {
    Name        = "${var.project_name}-private-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_route" "nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this.id
}

resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_vpc_endpoint" "s3" {
  count = var.create_s3_gateway_endpoint ? 1 : 0

  vpc_id            = var.vpc_id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"

  tags = {
    Name        = "${var.project_name}-s3-gateway"
    Environment = var.environment
  }

  # Associations are separate resources so the other environment can attach
  # its own route table without this resource deleting that association.
  lifecycle {
    ignore_changes = [route_table_ids]
  }
}

# Prod looks up the endpoint the test stack created. A miss means test has not
# been applied yet: this VPC can only have one S3 gateway endpoint.
data "aws_vpc_endpoint" "s3" {
  count = var.create_s3_gateway_endpoint ? 0 : 1

  vpc_id       = var.vpc_id
  service_name = "com.amazonaws.${var.aws_region}.s3"
}

resource "aws_vpc_endpoint_route_table_association" "s3_owned" {
  count = var.create_s3_gateway_endpoint ? 1 : 0

  vpc_endpoint_id = aws_vpc_endpoint.s3[0].id
  route_table_id  = aws_route_table.private.id
}

resource "aws_vpc_endpoint_route_table_association" "s3_shared" {
  count = var.create_s3_gateway_endpoint ? 0 : 1

  vpc_endpoint_id = data.aws_vpc_endpoint.s3[0].id
  route_table_id  = aws_route_table.private.id
}

resource "aws_security_group" "connector" {
  name_prefix = "${var.project_name}-apprunner-${var.environment}-"
  description = "Egress from the App Runner VPC connector"
  vpc_id      = var.vpc_id

  # No reference to the RDS security group: that reference cycles with the
  # database ingress rule. RDS allows this group in when the network is locked.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "NAT for Resend and other public APIs, plus the S3 prefix list"
  }

  tags = {
    Name        = "${var.project_name}-apprunner-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_security_group" "migration" {
  name_prefix = "${var.project_name}-db-tasks-${var.environment}-"
  description = "Egress from in-VPC database tasks"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "NAT for package installs, Secrets Manager, and CloudWatch"
  }

  tags = {
    Name        = "${var.project_name}-db-tasks-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "db_tasks" {
  bucket = local.db_tasks_bucket

  tags = {
    Name        = local.db_tasks_bucket
    Environment = var.environment
    Purpose     = "Source bundles for in-VPC database tasks"
  }
}

resource "aws_s3_bucket_public_access_block" "db_tasks" {
  bucket = aws_s3_bucket.db_tasks.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "db_tasks" {
  bucket = aws_s3_bucket.db_tasks.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "db_tasks" {
  bucket = aws_s3_bucket.db_tasks.id

  rule {
    id     = "expire-source-bundles"
    status = "Enabled"

    filter {}

    expiration {
      days = 14
    }
  }
}

resource "aws_iam_role" "codebuild" {
  name = local.codebuild_project

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "codebuild.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "codebuild" {
  name = local.codebuild_project
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/codebuild/${local.codebuild_project}*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeDhcpOptions",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeSubnets",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeVpcs",
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ec2:CreateNetworkInterfacePermission"]
        Resource = "arn:aws:ec2:${var.aws_region}:${data.aws_caller_identity.current.account_id}:network-interface/*"
        Condition = {
          StringEquals = {
            "ec2:AuthorizedService" = "codebuild.amazonaws.com"
          }
        }
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion"]
        Resource = "${aws_s3_bucket.db_tasks.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.db_tasks.arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        # Names are ashinaga-<purpose>-<environment>-<suffix>. Test and prod share this account.
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:ashinaga-*-${var.environment}-*"
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:ListSecrets"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["rds:DescribeDBInstances"]
        Resource = "*"
      },
    ]
  })
}

resource "aws_codebuild_project" "db_tasks" {
  name           = local.codebuild_project
  description    = "Runs database migrate, bootstrap, and populate inside the ${var.environment} private subnets"
  service_role   = aws_iam_role.codebuild.arn
  build_timeout  = 45
  queued_timeout = 15

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = false

    environment_variable {
      name  = "ENVIRONMENT"
      value = var.environment
    }

    environment_variable {
      name  = "PRIVATE_CIDRS"
      value = join(",", var.private_subnet_cidrs)
    }
  }

  source {
    type      = "NO_SOURCE"
    buildspec = file("${path.module}/buildspec.yml")
  }

  vpc_config {
    vpc_id             = var.vpc_id
    subnets            = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.migration.id]
  }

  tags = {
    Name        = local.codebuild_project
    Environment = var.environment
  }
}

resource "aws_iam_policy" "github_actions_db_tasks" {
  name = "${local.codebuild_project}-start"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "codebuild:StartBuild",
          "codebuild:BatchGetBuilds",
          "codebuild:BatchGetProjects",
        ]
        Resource = [
          aws_codebuild_project.db_tasks.arn,
          "arn:aws:codebuild:${var.aws_region}:${data.aws_caller_identity.current.account_id}:build/${local.codebuild_project}:*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:AbortMultipartUpload"]
        Resource = "${aws_s3_bucket.db_tasks.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.db_tasks.arn
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_actions_db_tasks" {
  count = var.github_actions_role_name == "" ? 0 : 1

  role       = var.github_actions_role_name
  policy_arn = aws_iam_policy.github_actions_db_tasks.arn
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "connector_security_group_id" {
  value = aws_security_group.connector.id
}

output "migration_security_group_id" {
  value = aws_security_group.migration.id
}

output "codebuild_project_name" {
  value = aws_codebuild_project.db_tasks.name
}

output "db_tasks_bucket_name" {
  value = aws_s3_bucket.db_tasks.bucket
}

output "github_actions_policy_arn" {
  description = "Attach this to the GitHub OIDC role when github_actions_role_name is empty."
  value       = aws_iam_policy.github_actions_db_tasks.arn
}

output "nat_gateway_id" {
  value = aws_nat_gateway.this.id
}
