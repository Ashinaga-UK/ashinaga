# Vercel Deployment Guide

This guide explains how to deploy the Ashinaga monorepo apps to Vercel.

## Overview

The Ashinaga monorepo contains two Next.js applications that can be deployed to Vercel:
- **Staff Portal** (`apps/staff`) - For staff members to manage scholars
- **Scholar Portal** (`apps/scholar`) - For scholars to access their resources

## Deployment Steps

### 1. Import Projects in Vercel

You'll need to create two separate projects in Vercel:

#### Staff Portal
1. Go to [vercel.com](https://vercel.com) and click "Add New Project"
2. Import your Git repository
3. Set the **Root Directory** to `apps/staff`
4. Vercel will automatically detect the `vercel.json` configuration
5. Deploy the project

#### Scholar Portal
1. Create another new project in Vercel
2. Import the same Git repository
3. Set the **Root Directory** to `apps/scholar`
4. Vercel will automatically detect the `vercel.json` configuration
5. Deploy the project

### 2. Environment Variables

If your apps require environment variables:
1. Go to Project Settings → Environment Variables
2. Add the required variables for each app
3. Redeploy to apply changes

### 3. Domain Configuration

You can configure custom domains for each app:
- Staff Portal: `staff.yourdomain.com`
- Scholar Portal: `scholar.yourdomain.com`

## Configuration Details

Each app has its own `vercel.json` file that specifies:
- Build command that uses Turborepo filtering
- Install command that runs from the monorepo root
- Framework detection (Next.js)
- Output directory

### apps/staff/vercel.json
```json
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=staff",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

### apps/scholar/vercel.json
```json
{
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=scholar",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

## Benefits of This Approach

1. **Independent Deployments**: Each app can be deployed independently
2. **Separate Environments**: Different environment variables for each app
3. **Optimized Builds**: Only builds the specific app and its dependencies
4. **Vercel Features**: Each app gets its own preview deployments, analytics, etc.

## Preview deployments: login not working

If you cannot log in on **Vercel Preview** (e.g. `scholar-git-xxx.vercel.app`), it is usually one of the following.

### 1. Environment variables for Preview

Vercel env vars can be set per environment (Production / Preview / Development). For **Preview**:

**Scholar and Staff (Vercel):**

- Set `NEXT_PUBLIC_API_URL` for the **Preview** environment to your API's public URL (e.g. `https://api.ashinaga-uk.org` or your test API URL).
- If this is only set for Production, Preview builds get the fallback `http://localhost:3000`, so auth and API calls go to the wrong place and login fails.

**API (wherever it runs):**

- `BETTER_AUTH_URL` must be the API's own public URL in that environment (e.g. `https://api-test.ashinaga-uk.org` for test, `https://api.ashinaga-uk.org` for production). It is used for redirects and session handling.
- Cross-origin cookies are **enabled automatically** for non-production environments (test/staging/preview). Session cookies use `SameSite=None; Secure` automatically, allowing the browser to send cookies when the frontend calls the API on a different domain. In production, where frontend and API are on the same registrable domain, `SameSite=Lax` is used instead.
- Point Preview `NEXT_PUBLIC_API_URL` at the **test** API. Production does not trust Vercel preview hosts.
- The API trusts origins listed in `CORS_ORIGINS`. It also trusts `http://localhost` on any port when `NODE_ENV` is not `production`. It does not trust `*.vercel.app`.
- To let this team's preview hosts call the test API, set `VERCEL_PREVIEW_ORIGIN_PATTERN` to a regex for the full origin, for example `^https://ashinaga-(staff|scholar)-[a-z0-9-]+-<team>\.vercel\.app$`. The pattern is ignored unless `NODE_ENV=test`. It is also ignored when it matches `https://not-this-team.vercel.app`, so `^https://.+\.vercel\.app$` does not allow every preview host. Leave it unset to reject every `*.vercel.app` origin. Set the GitHub Actions environment variable of the same name on the `test` environment (the deploy workflow forwards it). If you apply Terraform, put the same value in `infra/accounts/test/main.tf`, because apply rewrites App Runner environment variables.

### 2. CORS

Staff and scholar custom domains must be in `CORS_ORIGINS`. A Vercel preview host is allowed only when it matches `VERCEL_PREVIEW_ORIGIN_PATTERN` on the test API. `http://localhost` is allowed only outside production. A custom preview domain has to be added to `CORS_ORIGINS` on the test API.

### Checklist for Preview login

| Where | Variable | Required for Preview login |
|-------|----------|----------------------------|
| Scholar/Staff (Vercel) | `NEXT_PUBLIC_API_URL` (Preview) | Yes – must be the API URL (test/staging) |
| API | `BETTER_AUTH_URL` | Yes – API's own URL (must be HTTPS or non-localhost) |
| API | `NODE_ENV` | `test` on the test API (enables cross-origin cookies and the preview-origin pattern). `production` does not trust preview hosts or localhost |
| API | `VERCEL_PREVIEW_ORIGIN_PATTERN` | Only if Preview deployments should call the test API. Team-scoped origin regex. A pattern that matches `https://not-this-team.vercel.app` is ignored. Ignored in production |
| API | Cross-origin cookies | Automatic – enabled for non-production environments |

## Troubleshooting

### Build Failures
- Ensure all dependencies are properly listed in package.json files
- Check that the monorepo structure is correct
- Verify that Turborepo filters are working correctly

### Module Resolution Issues
- Make sure workspace dependencies use `workspace:*` syntax
- Ensure all shared packages are built before the apps

### Performance
- Vercel caches dependencies between builds
- Turborepo caches build outputs for faster subsequent builds