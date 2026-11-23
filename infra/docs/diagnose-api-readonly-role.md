# Diagnose API read-only IAM role (ASH-147)

The `Diagnose API` workflow (`.github/workflows/diagnose-api.yml`) assumes a
dedicated **read-only** role through the `AWS_DIAGNOSE_ROLE_ARN` GitHub
environment secret. It must not use the deploy role (`AWS_ROLE_ARN`).

This is the console path. Terraform for this role is deferred so it does not
collide with the account roots in #165. Do **not** create a new OIDC provider:
reuse the existing `token.actions.githubusercontent.com` provider in the account.

Replace placeholders: `<ACCOUNT_ID>`, `<env>` (`prod` or `test`), region `eu-west-3`.

## Prerequisites (do these first)

1. **Environment branch policies** (Settings → Environments → `prod` / `test` →
   Deployment branches). These are required before creating the diagnose role —
   the trust policy only proves the job ran in a given environment; branch
   policies stop a random branch from obtaining it:
   - `prod`: limit to `main` only
   - `test`: limit to `test` and `main`
2. **Deploy role unchanged on `main` until `test` is promoted.** Deploy API
   keeps using `AWS_ROLE_ARN`. Only Diagnose API uses `AWS_DIAGNOSE_ROLE_ARN`.
   Do not swap deploy over to the diagnose role.

Optional but recommended: required reviewers on each environment.

## Role names

One role per environment, so the trust policy can pin the GitHub environment:

- `ashinaga-diagnose-api-prod`
- `ashinaga-diagnose-api-test`

## Trust policy

Replace `<env>` with `prod` or `test`. The `sub` claim uses the GitHub
**environment** form, which matches the workflow's `environment:` setting.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:Ashinaga-UK/ashinaga:environment:<env>"
        }
      }
    }
  ]
}
```

## Permission policy

Name suggestion: `ashinaga-diagnose-api-<env>-readonly`. Replace `<env>`.

`DescribeService` is **not** included: its response contains
`RuntimeEnvironmentVariables` (plaintext secrets from deploy-api). The workflow
takes `ServiceId`, `Status`, `ServiceUrl`, and `UpdatedAt` from `ListServices`
summaries instead.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppRunnerListServices",
      "Effect": "Allow",
      "Action": "apprunner:ListServices",
      "Resource": "*"
    },
    {
      "Sid": "AppRunnerListOperations",
      "Effect": "Allow",
      "Action": "apprunner:ListOperations",
      "Resource": "arn:aws:apprunner:eu-west-3:<ACCOUNT_ID>:service/ashinaga-api-<env>/*"
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": "cloudwatch:GetMetricStatistics",
      "Resource": "*"
    },
    {
      "Sid": "LogsDescribeGroups",
      "Effect": "Allow",
      "Action": "logs:DescribeLogGroups",
      "Resource": "arn:aws:logs:eu-west-3:<ACCOUNT_ID>:log-group:*"
    },
    {
      "Sid": "LogsFilterApiGroups",
      "Effect": "Allow",
      "Action": "logs:FilterLogEvents",
      "Resource": [
        "arn:aws:logs:eu-west-3:<ACCOUNT_ID>:log-group:/aws/apprunner/ashinaga-api-<env>/*",
        "arn:aws:logs:eu-west-3:<ACCOUNT_ID>:log-group:/aws/apprunner/ashinaga-api-<env>/*:*"
      ]
    }
  ]
}
```

Notes on the scoping limits:

- `apprunner:ListServices` and `cloudwatch:GetMetricStatistics` do not support
  resource-level permissions, so they need `"Resource": "*"`.
- `logs:DescribeLogGroups` is granted on all log groups in the region (the
  workflow filters by `--log-group-name-prefix`); actual log **content** access
  (`FilterLogEvents`) is limited to `/aws/apprunner/ashinaga-api-<env>/*`.
- The workflow uses `list-services` for the service summary and
  `list-operations` for recent ops. Nothing here allows create/update/delete/deploy
  or `DescribeService`.

## Create the role in the console

1. Confirm the **Prerequisites** above (branch policies) are in place.
2. IAM → Policies → Create policy → JSON → paste the permission policy for the
   environment → name it `ashinaga-diagnose-api-<env>-readonly`.
3. IAM → Roles → Create role → **Custom trust policy** → paste the trust policy
   (with the right `<env>`).
4. Attach the permission policy from step 2. Do not attach any managed
   `*FullAccess` or `ReadOnlyAccess` policy.
5. Name the role `ashinaga-diagnose-api-<env>`. Set max session duration to 1 hour.
6. Copy the role ARN.
7. Repeat for the other environment.

Check that the OIDC provider already exists (IAM → Identity providers). Do not
create a second one.

## GitHub environment secrets

For each environment (Settings → Environments → `prod`, `test`):

1. Add environment **secret** `AWS_DIAGNOSE_ROLE_ARN` = that environment's
   `ashinaga-diagnose-api-<env>` role ARN.
2. Do not set it as a repository secret. Each environment needs its own value.

CLI alternative:

```bash
gh secret set AWS_DIAGNOSE_ROLE_ARN --env prod --body "arn:aws:iam::<ACCOUNT_ID>:role/ashinaga-diagnose-api-prod"
gh secret set AWS_DIAGNOSE_ROLE_ARN --env test --body "arn:aws:iam::<ACCOUNT_ID>:role/ashinaga-diagnose-api-test"
```

Then run Actions → Diagnose API → Run workflow, once per environment.

## Security notes

- **This is a public repository.** Workflow runs, logs, and step summaries are
  visible to anyone. The workflow deliberately prints only allow-listed
  aggregate fields and drops raw log messages. Do not add steps that echo
  service configuration, log messages, or AWS CLI stderr (AccessDenied errors
  include account and role ARNs).
- **Do not reintroduce `DescribeService`.** Even with a projected `--query`, the
  API still returns runtime env vars to anyone who can assume this role.
