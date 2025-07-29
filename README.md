# Ashinaga

A monorepo containing all deployable applications and shared code for the Ashinaga project.

## About Ashinaga

Ashinaga is an international foundation providing educational and emotional support to orphaned students from 49 countries in sub-Saharan Africa who have lost one or both parents. The foundation helps these students access higher education and develop leadership skills to contribute to their communities.

## 📁 Project Structure

This monorepo is organized into three main directories:

### `apps/` - Deployable Applications

### `packages/` - Shared Code

### `infra/` - Terraform code for the Ashinaga project



## 📄 Documentation

- **[Getting Started Guide](./docs/getting-started.md)** - Quick start and overview
- [API App Documentation](./apps/api/README.md)
- [Staff App Documentation](./apps/staff/README.md)
- [Scholar App Documentation](./apps/scholar/README.md)
- [Vercel Deployment Guide](./docs/VERCEL_DEPLOYMENT.md) - Deploy multiple apps to Vercel

## 📄 Package Specific Documentation

- [TypeScript Config Package Documentation](./packages/typescript-config/README.md)

## 📄 Infrastructure Specific Documentation

- [Infrastructure Documentation](./infra/README.md)

## Monorepo

This monorepo uses Turborepo and these tools are set up:

- [TypeScript](https://www.typescriptlang.org/) for static type-safety
- [Biome](https://biomejs.dev/) for code linting and formatting
- [Jest](https://jestjs.io/) & [Playwright](https://playwright.dev/) for testing
- [Storybook](https://storybook.js.org/) for UI component development

### Apps and Packages

    ├── apps
    │   ├── api                       # NestJS API server with PostgreSQL
    │   ├── staff                     # Next.js staff portal (port 3001)
    │   └── scholar                   # Next.js scholar portal (port 3002)
    └── packages
        ├── @workspace/jest-config         # Jest configurations
        ├── @workspace/typescript-config   # TypeScript configurations
        └── @workspace/ui                  # React component library

Each package and application are 100% [TypeScript](https://www.typescriptlang.org/) safe.

## 🔄 GitHub Workflows

A **Quality** workflow runs on every push to ensure code quality by running linting, tests, and builds across all packages. View results in the Actions tab or test locally with `pnpm lint && pnpm test && pnpm build`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher)
- [pnpm](https://pnpm.io/) (v10 or higher)

### Recommended tools:

- [Cursor](https://cursor.sh/) (recommended IDE)
- [Biome Cursor Extension](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) (automatically recommended when opening the workspace)
- [Terraform CLI](https://www.terraform.io/) (v1.10.0 or higher) - instructions for installation [here](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
- Terraform VSCode Extension - instructions for installation [here](https://marketplace.visualstudio.com/items?itemName=HashiCorp.terraform)
- [AWS CLI](https://aws.amazon.com/cli/) (v2.15.1 or higher) - instructions for installation [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)



### Commands

#### Build

```bash
# Will build all the app & packages with the supported `build` script.
pnpm run build

# ℹ️ If you plan to only build apps individually,
# Please make sure you've built the packages first.
```

#### Develop

```bash
# Will run the development server for all the app & packages with the supported `dev` script.
pnpm run dev
```

#### test

```bash
# Will launch a test suites for all the app & packages with the supported `test` script.
pnpm run test

# You can launch e2e testes with `test:e2e`
pnpm run test:e2e

# Generate test coverage reports
pnpm run test:coverage

# Generate and open coverage reports
pnpm run test:coverage:open

# See `@workspace/jest-config` to customize the behavior.
```

#### Test Coverage

Test coverage reports are generated in the `coverage/` directory for each app:

- **API App Coverage**: [`apps/api/coverage/lcov-report/index.html`](apps/api/coverage/lcov-report/index.html)
- **Web App Coverage**: [`apps/web/coverage/lcov-report/index.html`](apps/web/coverage/lcov-report/index.html)

Run `pnpm test:coverage:open` to generate and automatically open coverage reports in your browser.

#### Lint

```bash
# Will lint all the app & packages with the supported `lint` script.
# See `@workspace/eslint-config` to customize the behavior.
pnpm run lint
```

#### Format

```bash
# Will format all the supported `.ts,.js,json,.tsx,.jsx` files using Biome.
pnpm format
```

#### Storybook

```bash
# Start Storybook development server for UI components
cd packages/ui && pnpm storybook

# Build Storybook for production
cd packages/ui && pnpm build-storybook
```

### Remote Caching

See Turborepo's [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching) documentation for more information.