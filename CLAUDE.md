# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

This is a **Turborepo monorepo** with TypeScript, containing:

- **apps/api** - NestJS API server using Fastify (runs on default port)
- **apps/staff** - Next.js staff portal application (runs on port 3001)
- **apps/scholar** - Next.js scholar portal application (runs on port 3002)
- **packages/api** - Shared NestJS resources and DTOs
- **packages/ui** - React component library
- **packages/eslint-config** - ESLint configurations with Prettier
- **packages/jest-config** - Jest test configurations
- **packages/typescript-config** - TypeScript configurations

The API, staff, and scholar apps are designed to work together, with the frontend apps consuming the API endpoints.

## Essential Commands

Use `pnpm` as the package manager:

```bash
# Development (runs all apps in parallel)
pnpm dev

# Build everything (packages first, then apps)
pnpm build

# Run all tests
pnpm test

# Run e2e tests
pnpm test:e2e

# Generate test coverage reports
pnpm test:coverage

# Generate and open coverage reports
pnpm test:coverage:open

# Lint all code
pnpm lint

# Format all code
pnpm format
```

## Individual App Commands

### API (apps/api)

```bash
cd apps/api
pnpm dev          # Development with watch mode
pnpm build        # Build for production
pnpm start:debug  # Development with debug
pnpm test:watch   # Tests in watch mode
pnpm test:e2e     # End-to-end tests
```

### Staff (apps/staff)

```bash
cd apps/staff
pnpm dev          # Development server (port 3001)
pnpm build        # Build for production
pnpm test:watch   # Tests in watch mode
pnpm test:e2e     # Playwright e2e tests
```

### Scholar (apps/scholar)

```bash
cd apps/scholar
pnpm dev          # Development server (port 3002)
pnpm build        # Build for production
pnpm test:watch   # Tests in watch mode
pnpm test:e2e     # Playwright e2e tests
```

## Key Technical Details

- **Node.js**: Requires v18+ (configured in package.json engines)
- **Package Manager**: pnpm v8.15.5
- **API Framework**: NestJS with Fastify adapter
- **Frontend**: Next.js 15.x with React 18
- **Testing**: Jest for unit tests, Playwright for e2e
- **Monorepo**: Turborepo with workspace dependencies using `workspace:*`

## Workspace Dependencies

Packages reference each other using `workspace:*` syntax:

- `@workspace/api` - Shared API resources
- `@workspace/ui` - React components
- `@workspace/eslint-config` - Linting rules
- `@workspace/jest-config` - Test configurations
- `@workspace/typescript-config` - TypeScript settings

When making changes, ensure you build packages before apps since apps depend on built packages.

## Infrastructure

The project uses **Terraform** for Infrastructure as Code (IaC) with a production-ready setup:

- **infra/accounts/** - Environment-specific configurations (playground, test, prod)
- **infra/modules/** - Reusable Terraform modules (app_runner_service, ecr_repository)
- **infra/scripts/** - Bootstrap scripts and helper utilities
- **infra/DEPLOYMENT_GUIDE.md** - Complete setup guide for fresh AWS accounts

### Deployment Architecture

The API infrastructure includes:
- **ECR Repository** - Docker image storage with lifecycle policies
- **RDS PostgreSQL** - Database with proper security groups and timeouts
- **AWS App Runner** - Auto-scaling containerized API deployment
- **S3 + Lockfile** - Remote Terraform state with modern locking
- **GitHub Actions** - CI/CD with Drizzle migrations

**Region**: eu-west-3 (default)

### Infrastructure Commands

**IMPORTANT**: Always use AWS_PROFILE for environment isolation:

```bash
# Bootstrap remote state (one-time setup)
cd infra/scripts
AWS_PROFILE=playground ./bootstrap-state.sh

# Deploy infrastructure
cd infra/accounts/playground
AWS_PROFILE=playground terraform init
AWS_PROFILE=playground terraform plan
AWS_PROFILE=playground terraform apply

# Destroy infrastructure
AWS_PROFILE=playground terraform destroy
```

### Key Infrastructure Features

- **Remote State**: S3 backend with `use_lockfile = true` (no DynamoDB needed)
- **Idempotency**: Proper resource lifecycle management and extended timeouts
- **Smart Bootstrap**: Hello World image only deploys if ECR is empty
- **Database Support**: RDS PostgreSQL with connection details in App Runner
- **Architecture Fix**: Docker images built for linux/amd64 (App Runner compatible)

### Troubleshooting Infrastructure

- **State Issues**: Use `terraform refresh` and import commands for drift
- **Docker Issues**: Ensure Docker Desktop is running and images are linux/amd64
- **App Runner Failures**: Check CloudWatch logs and verify image architecture
- **Database Timeouts**: Extended 60-minute delete timeout configured

See `infra/DEPLOYMENT_GUIDE.md` for complete setup instructions.

## API & Frontend Integration Patterns

### Authentication
- **Better Auth**: Cookie-based authentication with sessions
- Auth endpoints are at `/api/auth/*` (login, signup, etc.)
- All API requests must include `credentials: 'include'` for cookie authentication

### Creating New API Endpoints

1. **DTOs**: Define request/response DTOs in the service folder
2. **Service**: Implement business logic using Drizzle ORM
   - Use `inArray()` for SQL IN operations (not raw SQL `ANY`)
   - Handle joins with proper type safety
   - Aggregate related data (goals, tasks stats)
3. **Controller**: 
   - Prefix all routes with `/api/` for consistency
   - Place specific routes before parameterized routes (e.g., `/filters` before `/:id`)
   - Use validation pipes for query parameters
4. **Tests**: Write basic happy-path tests for both service and controller

### Frontend Data Fetching

1. **API Client** (`apps/staff/lib/api-client.ts`):
   ```typescript
   async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
     const response = await fetch(url, {
       ...options,
       credentials: 'include', // Essential for auth
     });
   }
   ```

2. **Component Patterns**:
   - Use `useState` for data, loading, and error states
   - Implement debounced search to reduce API calls
   - Fetch filter options dynamically from the database
   - Handle pagination with proper state management

3. **Common Issues & Solutions**:
   - **Hydration errors**: Add `suppressHydrationWarning` to body tags
   - **Route mismatches**: Ensure controller routes match frontend expectations
   - **TypeScript**: Cast checkbox refs as `HTMLInputElement` not `any`

### Database & ORM

- **Drizzle ORM**: Primary database interface
- **PostgreSQL**: Main database
- Use `selectDistinct` for getting unique filter values
- Handle nullable fields with proper TypeScript types

### Development Workflow

1. Always run `pnpm lint` to check for issues
2. Fix linting with `pnpm lint` (runs biome check with fixes)
3. Test endpoints with Swagger UI before frontend integration
4. Use loading states and error handling in all data fetching components
5. **IMPORTANT**: Do NOT run `pnpm dev` or attempt to start development servers - they are always running in the background
