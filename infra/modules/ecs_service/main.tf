# API service on ECS Fargate behind an Application Load Balancer.
# Replaces the App Runner service (App Runner is closed to new customers).

data "aws_region" "current" {}

locals {
  tags = {
    Name        = var.service_name
    Environment = var.environment
  }
}

# --- Logs ---------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.service_name}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

# --- IAM ----------------------------------------------------------------------

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Used by ECS itself: pull the image, write logs, read the secrets at task start.
resource "aws_iam_role" "execution" {
  name               = "${var.service_name}-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "execution_secrets" {
  count = length(var.secrets) > 0 ? 1 : 0

  name = "read-app-secrets"
  role = aws_iam_role.execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = distinct(values(var.secrets))
    }]
  })
}

# Used by the application code (e.g. S3 for scholar documents).
resource "aws_iam_role" "task" {
  name               = "${var.service_name}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "task" {
  for_each = toset(var.task_policy_arns)

  role       = aws_iam_role.task.name
  policy_arn = each.value
}

# --- Networking ---------------------------------------------------------------

resource "aws_security_group" "alb" {
  name_prefix = "${var.service_name}-alb-"
  description = "Public HTTP/HTTPS to the ${var.service_name} load balancer"
  vpc_id      = var.vpc_id
  tags        = local.tags

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP (redirected to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "task" {
  name_prefix = "${var.service_name}-task-"
  description = "Only the load balancer can reach ${var.service_name} tasks"
  vpc_id      = var.vpc_id
  tags        = local.tags

  ingress {
    description     = "App port from the load balancer"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Database, Secrets Manager, ECR, S3, Resend.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- TLS certificate ----------------------------------------------------------
# DNS for ashinaga-uk.org is on Google Cloud DNS, so the validation record is
# added there by hand (see the acm_validation_records output). Apply waits for it.

resource "aws_acm_certificate" "this" {
  domain_name       = var.domain_name
  validation_method = "DNS"
  tags              = local.tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "this" {
  certificate_arn = aws_acm_certificate.this.arn

  timeouts {
    create = "2h"
  }
}

# --- Load balancer ------------------------------------------------------------

resource "aws_lb" "this" {
  name               = var.service_name
  load_balancer_type = "application"
  internal           = false
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids
  tags               = local.tags
}

resource "aws_lb_target_group" "this" {
  name        = var.service_name
  port        = var.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id
  tags        = local.tags

  deregistration_delay = 30

  health_check {
    path                = var.health_check_path
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.this.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }
}

# --- ECS ----------------------------------------------------------------------

resource "aws_ecs_cluster" "this" {
  name = var.service_name
  tags = local.tags

  setting {
    name  = "containerInsights"
    value = "disabled"
  }
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  tags                     = local.tags

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "api"
    image     = var.image
    essential = true

    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
    }]

    environment = [for k in sort(keys(var.env_vars)) : { name = k, value = var.env_vars[k] }]
    secrets     = [for k in sort(keys(var.secrets)) : { name = k, valueFrom = var.secrets[k] }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.this.name
        awslogs-region        = data.aws_region.current.region
        awslogs-stream-prefix = "api"
      }
    }
  }])
}

resource "aws_ecs_service" "this" {
  name            = var.service_name
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"
  tags            = local.tags

  # Give Nest time to boot before the load balancer health check counts.
  health_check_grace_period_seconds = 120

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  # A deployment whose tasks never get healthy is rolled back automatically.
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = true # Default VPC has no NAT; needed to reach ECR, Secrets Manager, RDS
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "api"
    container_port   = var.container_port
  }

  depends_on = [
    aws_lb_listener.https,
    aws_iam_role_policy_attachment.execution,
    aws_iam_role_policy.execution_secrets,
  ]
}

# --- CI deploy permissions ----------------------------------------------------
# CI pushes a new image to the same tag and forces a new deployment.

resource "aws_iam_role_policy" "deploy" {
  count = var.deploy_role_name == null ? 0 : 1

  name = "${var.service_name}-ecs-deploy"
  role = var.deploy_role_name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:DescribeServices"]
        Resource = aws_ecs_service.this.id
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:ListServices", "ecs:DescribeClusters"]
        Resource = "*"
      }
    ]
  })
}
