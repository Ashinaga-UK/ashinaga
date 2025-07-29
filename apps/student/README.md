# Ashinaga Student Portal

A Next.js application for Ashinaga students to access their resources and manage their learning journey.

## Overview

The Student Portal provides students with access to:
- Learning resources
- Goal tracking
- Communication with mentors
- Progress monitoring

Currently, this is a placeholder application with a simple landing page. Features will be added as requirements are defined.

## Tech Stack

- **Framework**: Next.js 15.x
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Component Library**: @workspace/ui (shared components)

## Development

### Prerequisites
- Node.js v18+
- pnpm v10+

### Getting Started

```bash
# From the monorepo root
pnpm install

# Start the development server (runs on port 3002)
cd apps/student
pnpm dev

# Or from the monorepo root
pnpm dev --filter=student
```

### Available Scripts

- `pnpm dev` - Start development server on port 3002
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run linting
- `pnpm format` - Format code
- `pnpm test` - Run tests
- `pnpm test:e2e` - Run end-to-end tests

## Deployment

This app can be deployed to Vercel. See the [Vercel Deployment Guide](../../docs/VERCEL_DEPLOYMENT.md) for detailed instructions.

The app includes a `vercel.json` configuration that:
- Builds from the monorepo root
- Uses Turborepo for optimized builds
- Only builds this app and its dependencies

## Environment Variables

Currently, no environment variables are required. As features are added, document any required variables here.

## Architecture

This app is part of the Ashinaga monorepo and:
- Shares UI components from `@workspace/ui`
- Uses shared TypeScript and Jest configurations
- Will connect to the API server for data operations

## Future Features

Planned features include:
- Student authentication
- Dashboard with personalized content
- Goal setting and tracking
- Resource library
- Communication tools
- Progress reports