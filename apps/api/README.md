# Ashinaga API Server

A minimal NestJS API server for the Ashinaga platform, built with Fastify and PostgreSQL.

## Getting Started

First, run the development server:

```bash
pnpm run dev
```

By default, your server will run at [http://localhost:3000](http://localhost:3000). 

- **API Documentation**: [http://localhost:3000/api](http://localhost:3000/api) (Swagger UI)
- **Homepage**: [http://localhost:3000](http://localhost:3000) (API welcome page)

## Architecture

This is a minimal NestJS application with:

- **Framework**: NestJS with Fastify adapter
- **Database**: PostgreSQL with Drizzle ORM
- **Documentation**: Swagger/OpenAPI
- **Validation**: Built-in NestJS validation pipes

## Database

### Setup

Start the PostgreSQL database using Docker:

```bash
pnpm docker
```

### Schema Management

```bash
# Generate migrations from schema changes
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Run Drizzle Studio (database inspector)
pnpm db:studio
```

Drizzle Studio will be available at [https://localhost:4983](https://localhost:4983).

**Note**: Your browser may warn about a self-signed certificate. Accept it to use Drizzle Studio.

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate test coverage report
pnpm test:coverage

# Generate and open coverage report
pnpm test:coverage:open
```

**Test Coverage Report**: View at [`coverage/lcov-report/index.html`](coverage/lcov-report/index.html) after running coverage.

## Development

### Adding New Endpoints

1. Create a new module, controller, and service
2. Import the module in `app.module.ts`
3. Add Swagger decorators for documentation
4. Update database schema in `src/db/schema.ts` if needed

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck
```

## Building

```bash
# Build the application
pnpm build

# Start production server
pnpm start:prod
```

**Note**: Make sure packages are built first if building individually.

## Deployment

See the infrastructure documentation at [infra/README.md](../../infra/README.md) for AWS deployment instructions.

## Learn More

- [NestJS Documentation](https://docs.nestjs.com) - Framework documentation
- [Drizzle ORM](https://orm.drizzle.team) - Database ORM documentation
- [Fastify](https://www.fastify.io) - Web framework documentation