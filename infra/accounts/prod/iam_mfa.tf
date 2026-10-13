# Let every IAM user set up MFA on their own user. AWS requires MFA on all
# users of this account before it lifts the Oct 2026 account restriction.
# Account-wide IAM, so it lives in one stack (prod) only.

locals {
  iam_user_groups = ["Admin", "Billing", "Engineers"]
}

data "aws_iam_policy_document" "self_manage_mfa" {
  statement {
    sid       = "ListMfaDevices"
    actions   = ["iam:ListVirtualMFADevices"]
    resources = ["*"]
  }

  # Device names are free text in the console (e.g. "rgnpx-mac"), so creating
  # one can't be tied to the user name; attaching it can.
  statement {
    sid       = "CreateVirtualMfaDevice"
    actions   = ["iam:CreateVirtualMFADevice"]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:mfa/*"]
  }

  statement {
    sid = "ManageOwnMfa"
    actions = [
      "iam:EnableMFADevice",
      "iam:ResyncMFADevice",
      "iam:DeactivateMFADevice",
      "iam:ListMFADevices",
      "iam:GetUser",
    ]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/$${aws:username}"]
  }

  statement {
    sid       = "DeleteOwnUnassignedMfaDevice"
    actions   = ["iam:DeleteVirtualMFADevice"]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:mfa/*"]
  }
}

data "aws_caller_identity" "current" {}

resource "aws_iam_policy" "self_manage_mfa" {
  name        = "SelfManageMFA"
  description = "Lets each IAM user add, resync and remove an MFA device on their own user"
  policy      = data.aws_iam_policy_document.self_manage_mfa.json
}

resource "aws_iam_group_policy_attachment" "self_manage_mfa" {
  for_each = toset(local.iam_user_groups)

  group      = each.value
  policy_arn = aws_iam_policy.self_manage_mfa.arn
}
