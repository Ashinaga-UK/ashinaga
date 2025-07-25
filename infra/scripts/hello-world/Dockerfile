FROM --platform=linux/amd64 node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies
RUN npm install --only=production

# Copy application code
COPY index.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]