# Ashinaga Web App

A minimal Next.js web application for the Ashinaga platform, built with React and TailwindCSS.

## Getting Started

First, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the application.

## Architecture

This is a minimal Next.js application with:

- **Framework**: Next.js 15 with App Router
- **Styling**: TailwindCSS
- **Components**: Custom UI components from `@workspace/ui`
- **Icons**: Lucide React
- **Fonts**: Geist (sans & mono)

## Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   ├── error.tsx          # Error page
│   └── not-found.tsx      # 404 page
├── components/            # React components
│   ├── __tests__/         # Component tests
│   └── logo.tsx           # Ashinaga logo
└── globals.css            # Global styles
```

## Development

### Adding New Pages

1. Create a new file in the `app/` directory
2. Export a default React component
3. Next.js will automatically create the route

### Adding New Components

1. Create a new file in `components/`
2. Use the shared UI components from `@workspace/ui`
3. Add tests in `components/__tests__/`

### Styling

- Uses TailwindCSS for styling
- Custom UI components available from `@workspace/ui` package
- Dark mode support built into UI components

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

## Code Quality

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
pnpm start
```

**Note**: Make sure packages are built first if building individually.

## Available UI Components

From `@workspace/ui`:

- **Button** - Interactive buttons with variants
- **Card** - Content containers with header/footer
- **Input** - Form inputs
- **Label** - Form labels
- **Container** - Layout wrapper
- **Separator** - Visual dividers
- **Logo** - Ashinaga text logo

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Framework documentation
- [TailwindCSS](https://tailwindcss.com) - Styling framework
- [Lucide Icons](https://lucide.dev) - Icon library