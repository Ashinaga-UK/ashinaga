variable "secret_name_prefix" {
  description = "Prefix for the secret name (AWS will add a random suffix)"
  type        = string
}

variable "description" {
  description = "Description of the secret"
  type        = string
  default     = "Managed by Terraform"
}

variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "secret_value" {
  description = "The secret value to store. If null, a random password will be generated"
  type        = string
  default     = null
  sensitive   = true
}

variable "password_length" {
  description = "Length of the generated password (only used if secret_value is null)"
  type        = number
  default     = 32
}

variable "include_special_chars" {
  description = "Include special characters in generated password"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ID for encrypting the secret"
  type        = string
  default     = null
}

variable "recovery_window_in_days" {
  description = "Number of days that AWS Secrets Manager waits before deleting the secret"
  type        = number
  default     = 7
}

variable "force_overwrite_replica_secret" {
  description = "Whether to overwrite a secret with the same name in the destination Region"
  type        = bool
  default     = false
}

variable "additional_tags" {
  description = "Additional tags to apply to the secret"
  type        = map(string)
  default     = {}
}