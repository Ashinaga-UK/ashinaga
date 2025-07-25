terraform {
  backend "s3" {
    bucket       = "ashinaga-terraform-state-playground"
    key          = "playground/terraform.tfstate"
    region       = "eu-west-3"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }

  required_version = ">= 1.2"
}
