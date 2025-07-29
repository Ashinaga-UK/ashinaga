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