variable "security_group_id" {
  description = "RDS security group whose existing public 5432 rule should be adopted."
  type        = string
}

variable "cidr_blocks" {
  description = "Public CIDRs kept only while the database is unlocked."
  type        = list(string)
}

variable "locked" {
  description = "When true, remove the public rule and do not look one up."
  type        = bool
}
