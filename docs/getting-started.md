# Getting Started with Ashinaga

Welcome to the Ashinaga monorepo! This is a minimal, clean starting point for building the Ashinaga scholar management platform.

## Quick Start

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the database**:
   ```bash
   pnpm dev:db
   ```

3. **Run the applications**:
   ```bash
   pnpm dev
   ```

This will start:
- **API**: [http://localhost:3000](http://localhost:3000)
- **Web App**: [http://localhost:3001](http://localhost:3001)
- **Storybook**: [http://localhost:6006](http://localhost:6006)

## What's Included

### Apps
- **API** (`apps/api/`) - NestJS server with PostgreSQL and Swagger docs
- **Web** (`apps/web/`) - Next.js application with TailwindCSS

### Packages
- **UI** (`packages/ui/`) - 7 essential React components
- **Jest Config** (`packages/jest-config/`) - Shared testing configuration
- **TypeScript Config** (`packages/typescript-config/`) - Shared TypeScript settings

### Infrastructure
- **GitHub Workflows** - Automated testing and AWS deployment
- **Docker** - PostgreSQL database setup
- **Terraform** - AWS infrastructure as code

## Architecture Decisions

This is intentionally minimal to serve as a blank starting point:

- **No authentication** - Add your own auth system
- **No complex forms** - Simple components only
- **No business logic** - Ready for your domain models
- **No tRPC** - Use REST APIs or add your preferred API layer
- **No internationalization** - English only, add i18n if needed

## Next Steps

1. **Define your domain models** in `apps/api/src/db/schema.ts`
2. **Create API endpoints** by adding new NestJS modules
3. **Build UI components** using the existing UI foundation
4. **Add business logic** specific to Ashinaga's needs

## Development Workflow

```bash
# Run tests
pnpm test

# Check code quality
pnpm lint

# Build everything
pnpm build

# Database operations
pnpm db:studio    # Visual database editor
pnpm db:push      # Push schema changes
```

## Deployment

The infrastructure is ready for AWS deployment:

1. Configure AWS credentials
2. Run terraform in `infra/accounts/test/` or `infra/accounts/prod/`
3. Push to `test` or `main` branch to trigger deployment

See [infra/README.md](../infra/README.md) for detailed deployment instructions.

## Learn More

- [API Documentation](../apps/api/README.md)
- [Web App Documentation](../apps/web/README.md)
- [Infrastructure Documentation](../infra/README.md)