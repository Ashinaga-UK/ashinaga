# Use Node.js 20+ as specified in package.json engines
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10

# Set working directory
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# Copy packages
COPY packages/ ./packages/

# Copy API app
COPY apps/api/ ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build packages first (required for workspace dependencies)
RUN pnpm -r --filter="./packages/*" build

# Change to API directory and build there (where nest.json expects it)
WORKDIR /app/apps/api
RUN pnpm build
RUN echo "Build completed, checking dist folder:" && ls -la dist/ || echo "No dist folder created"

# Expose port
EXPOSE 3000

# Start the application (we're already in the right directory)
CMD ["node", "dist/main.js"]