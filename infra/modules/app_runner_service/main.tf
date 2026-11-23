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

# VPC connector. Required so an apply cannot silently drop private egress.
variable "vpc_connector_name" {
  description = "Stable prefix for the VPC connector. A hash of the subnets and security groups is appended so a replacement can be created before the old connector is destroyed."
  type        = string
}
variable "vpc_id" {
  description = "VPC ID for the VPC connector"
  type        = string
  default     = null
}
variable "subnet_ids" {
  description = "Private subnet IDs for the VPC connector. At least two, in different AZs. Never the default public subnets."
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "The App Runner VPC connector needs subnets in at least two availability zones."
  }
}
variable "security_group_ids" {
  description = "Dedicated security group IDs for the VPC connector. An empty list would use the VPC default security group."
  type        = list(string)

  validation {
    condition     = length(var.security_group_ids) > 0
    error_message = "Pass a dedicated connector security group. An empty list falls through to the VPC default security group."
  }
}

variable "additional_policy_arns" {
  description = "Additional IAM policy ARNs to attach to the App Runner instance role"
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

# Instance role for App Runner service
resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.service_name}-apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

# Attach additional policies to the instance role
resource "aws_iam_role_policy_attachment" "additional_policies" {
  count      = length(var.additional_policy_arns)
  role       = aws_iam_role.apprunner_instance_role.name
  policy_arn = var.additional_policy_arns[count.index]
}

locals {
  # The name changes when the subnets or security groups change, so
  # create_before_destroy can create the replacement before deleting the name
  # AWS still holds.
  vpc_connector_name = substr(
    "${var.vpc_connector_name}-${substr(sha256("${join(",", sort(var.subnet_ids))}:${join(",", sort(var.security_group_ids))}"), 0, 8)}",
    0,
    40,
  )
}

# VPC connector for private egress. Inbound public access to the service is unchanged.
resource "aws_apprunner_vpc_connector" "this" {
  vpc_connector_name = local.vpc_connector_name
  subnets            = var.subnet_ids
  security_groups    = var.security_group_ids

  tags = {
    Name        = local.vpc_connector_name
    Environment = var.environment
  }

  lifecycle {
    create_before_destroy = true
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
    cpu               = var.cpu
    memory            = var.memory
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
  }

  # Egress only. Do not set ingress here: that flag would make the public API hostname private.
  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.this.arn
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
      # Ignore all secrets - GitHub Actions workflow manages these
      source_configuration[0].image_repository[0].image_configuration[0].runtime_environment_variables["DB_PASSWORD"],
      source_configuration[0].image_repository[0].image_configuration[0].runtime_environment_variables["BETTER_AUTH_SECRET"],
      source_configuration[0].image_repository[0].image_configuration[0].runtime_environment_variables["RESEND_API_KEY"],
      source_configuration[0].image_repository[0].image_configuration[0].runtime_environment_variables["CRON_SECRET"]
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
