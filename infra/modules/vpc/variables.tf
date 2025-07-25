variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "additional_tags" {
  description = "Additional tags to apply to the VPC"
  type        = map(string)
  default     = {}
}