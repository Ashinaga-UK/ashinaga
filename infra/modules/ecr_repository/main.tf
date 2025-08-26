variable "repository_name" {
  description = "Name of the ECR repository"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., playground, test, prod)"
  type        = string
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Indicates whether images are scanned after being pushed to the repository"
  type        = bool
  default     = true
}

resource "aws_ecr_repository" "this" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability
  force_delete         = true # Allow deletion even with images

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  tags = {
    Name        = var.repository_name
    Environment = var.environment
  }
}

resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep only 2 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 2 # Reduced from 10 for cost optimization
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images after 1 day"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 1 # Reduced from 7 for cost optimization
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 3
        description  = "Delete test/development images after 3 days"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["test", "dev", "latest"]
          countType     = "sinceImagePushed"
          countUnit     = "days"
          countNumber   = 3
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

output "repository_arn" {
  description = "Full ARN of the repository"
  value       = aws_ecr_repository.this.arn
}

output "repository_name" {
  description = "Name of the repository"
  value       = aws_ecr_repository.this.name
}

output "repository_url" {
  description = "The URL of the repository"
  value       = aws_ecr_repository.this.repository_url
}

output "registry_id" {
  description = "The registry ID where the repository was created"
  value       = aws_ecr_repository.this.registry_id
}
