variable "service_name" {}
variable "image_identifier" {}
variable "port" {
  default = 3000
}
variable "cpu" {
  default = "1024"
}
variable "memory" {
  default = "2048"
}
variable "env_vars" {
  type    = map(string)
  default = {}
}
variable "region" {
  default = "eu-west-3"
}
variable "environment" {
  description = "Environment name (e.g., playground, test, prod)"
  type        = string
}

# VPC connector variables (optional)
variable "vpc_connector_name" {
  description = "Name of the VPC connector for private network access"
  type        = string
  default     = null
}
variable "vpc_id" {
  description = "VPC ID for the VPC connector"
  type        = string
  default     = null
}
variable "subnet_ids" {
  description = "Subnet IDs for the VPC connector"
  type        = list(string)
  default     = []
}
variable "security_group_ids" {
  description = "Security group IDs for the VPC connector"
  type        = list(string)
  default     = []
}

resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.service_name}-apprunner-access-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_access_role_policy" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# VPC connector for private network access (optional)
resource "aws_apprunner_vpc_connector" "this" {
  count = var.vpc_connector_name != null ? 1 : 0

  vpc_connector_name = var.vpc_connector_name
  subnets            = var.subnet_ids
  security_groups    = var.security_group_ids

  tags = {
    Name        = var.vpc_connector_name
    Environment = var.environment
  }
}

resource "aws_apprunner_service" "this" {
  service_name = var.service_name

  source_configuration {
    image_repository {
      image_identifier      = var.image_identifier
      image_repository_type = "ECR"
      image_configuration {
        port                          = var.port
        runtime_environment_variables = var.env_vars
      }
    }

    auto_deployments_enabled = true
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }
  }

  instance_configuration {
    cpu    = var.cpu
    memory = var.memory
  }

  # Network configuration for VPC connector (optional)
  dynamic "network_configuration" {
    for_each = var.vpc_connector_name != null ? [1] : []
    content {
      egress_configuration {
        egress_type       = "VPC"
        vpc_connector_arn = aws_apprunner_vpc_connector.this[0].arn
      }
    }
  }

  health_check_configuration {
    healthy_threshold   = 1
    interval            = 20
    path                = "/health"
    protocol            = "HTTP"
    timeout             = 10
    unhealthy_threshold = 3
  }

  tags = {
    Name        = var.service_name
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [
      source_configuration[0].image_repository[0].image_configuration[0].runtime_environment_variables["DB_PASSWORD"]
    ]
  }
}

output "service_arn" {
  description = "The ARN of the App Runner service"
  value       = aws_apprunner_service.this.arn
}

output "service_id" {
  description = "The ID of the App Runner service"
  value       = aws_apprunner_service.this.service_id
}

output "service_url" {
  description = "The URL of the App Runner service"
  value       = aws_apprunner_service.this.service_url
}

output "status" {
  description = "The current status of the App Runner service"
  value       = aws_apprunner_service.this.status
}
