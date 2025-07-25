# Generate a random password if one is not provided
resource "random_password" "password" {
  count   = var.secret_value == null ? 1 : 0
  length  = var.password_length
  special = var.include_special_chars
  # Exclude characters that RDS doesn't allow: '/', '@', '"', ' '
  override_special = "!#$%&*()-_=+[]{}|;:,.<>?"
}

# Create the secret
resource "aws_secretsmanager_secret" "secret" {
  name_prefix                 = var.secret_name_prefix
  description                 = var.description
  kms_key_id                  = var.kms_key_id
  recovery_window_in_days     = var.recovery_window_in_days
  force_overwrite_replica_secret = var.force_overwrite_replica_secret

  tags = merge(
    {
      Name        = var.secret_name_prefix
      Environment = var.environment
    },
    var.additional_tags
  )
}

# Store the secret value
resource "aws_secretsmanager_secret_version" "secret_version" {
  secret_id = aws_secretsmanager_secret.secret.id
  secret_string = var.secret_value != null ? var.secret_value : random_password.password[0].result

  lifecycle {
    ignore_changes = [secret_string]
  }
}