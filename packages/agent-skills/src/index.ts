#!/usr/bin/env tsx
import { LinearClient } from '@linear/sdk';

const TEAM_ID = 'cf657477-d9f1-4797-80c8-0f73ccc63f9a';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

async function main(): Promise<void> {
  const apiKey = process.env.LINEAR_API_KEY;
  const title = process.argv[2];

  if (!apiKey) {
    console.error('Missing API key. Set LINEAR_API_KEY.');
    process.exit(1);
  }

  if (!title) {
    console.error('Usage: pnpm --filter agent-skills dev "<ticket title>"');
    process.exit(1);
  }

  // Infer problem domain and context from title
  function inferDomain(title: string): {
    domains: string[];
    keywords: Set<string>;
    isInstall: boolean;
    isFix: boolean;
    isMigration: boolean;
  } {
    const lowerTitle = title.toLowerCase();
    const words = lowerTitle.split(/\s+/).map((w) => w.replace(/[^\w@-]/g, ''));
    const keywords = new Set(words);

    const domains: string[] = [];
    let isInstall = false;
    let isFix = false;
    let isMigration = false;

    // Domain inference from keywords
    if (keywords.has('security') || keywords.has('csrf') || keywords.has('xss')) domains.push('security');
    if (keywords.has('helmet') || keywords.has('cors')) domains.push('security');
    if (keywords.has('auth') || keywords.has('login') || keywords.has('session')) domains.push('auth');
    if (keywords.has('database') || keywords.has('db') || keywords.has('pool') || keywords.has('migrate')) domains.push('database');
    if (keywords.has('performance') || keywords.has('memory') || keywords.has('leak') || keywords.has('cache')) domains.push('performance');
    if (keywords.has('timeout') || keywords.has('retry') || keywords.has('throttle')) domains.push('reliability');
    if (keywords.has('log') || keywords.has('monitor') || keywords.has('metric')) domains.push('observability');
    if (keywords.has('error') || keywords.has('exception') || keywords.has('handling')) domains.push('error-handling');

    // Action type inference
    if (keywords.has('add') || keywords.has('install') || keywords.has('register') || keywords.has('enable')) isInstall = true;
    if (keywords.has('fix') || keywords.has('resolve') || keywords.has('patch')) isFix = true;
    if (keywords.has('migrate') || keywords.has('upgrade') || keywords.has('refactor')) isMigration = true;

    return { domains, keywords, isInstall, isFix, isMigration };
  }

  // Generate context based on inferred domain
  function generateContext(domain: { domains: string[]; keywords: Set<string>; isInstall: boolean; isFix: boolean; isMigration: boolean; }): string {
    const primaryDomain = domain.domains[0] || 'general';

    const contextMap: Record<string, string> = {
      security: 'Security vulnerabilities and missing protections expose the application to attacks. Implementing security best practices protects user data and builds confidence.',
      auth: 'Authentication and session management are critical for application security and user trust. Reliability in auth systems prevents lockouts and data breaches.',
      database: 'Database connection management and migrations impact application stability, performance, and data integrity. Proper pool configuration prevents connection exhaustion.',
      performance: 'Performance issues degrade user experience and increase infrastructure costs. Addressing bottlenecks improves responsiveness and resource efficiency.',
      reliability: 'Reliability patterns like timeouts and retries prevent cascading failures and improve user experience during transient issues.',
      observability: 'Logging and monitoring provide visibility into application behavior, making it easier to diagnose issues and track performance.',
      'error-handling': 'Comprehensive error handling improves debuggability and allows graceful degradation when issues occur.',
      general: 'This change improves code quality, maintainability, or functionality in the Ashinaga monorepo.',
    };

    return contextMap[primaryDomain] || contextMap.general;
  }

  // Generate severity label if warranted
  function generateSeverity(domain: { domains: string[]; keywords: Set<string>; isInstall: boolean; isFix: boolean; isMigration: boolean; }): string {
    const highSeverityDomains = ['security', 'database'];
    const mediumSeverityDomains = ['reliability', 'auth', 'performance'];

    if (domain.domains.some((d) => highSeverityDomains.includes(d))) {
      return 'High — Missing implementation creates security risks or data integrity issues';
    }
    if (domain.domains.some((d) => mediumSeverityDomains.includes(d))) {
      return 'Medium — Impacts availability, security, or user experience';
    }
    return undefined as any;
  }

  // Infer likely files to modify from title
  function inferFiles(title: string, domain: { domains: string[]; keywords: Set<string> }): string[] {
    const files: Set<string> = new Set();
    const lowerTitle = title.toLowerCase();

    // Add based on domain
    if (domain.domains.includes('security') || domain.domains.includes('auth')) files.add('apps/api/src/main.ts');
    if (domain.domains.includes('database')) files.add('apps/api/src/db');
    if (domain.domains.includes('observability') || domain.domains.includes('error-handling'))
      files.add('apps/api/src/common');

    // Add based on keywords
    if (domain.keywords.has('helmet') || domain.keywords.has('cors')) files.add('apps/api/src/main.ts');
    if (domain.keywords.has('pool') || domain.keywords.has('migrate')) files.add('apps/api/drizzle.config.ts');
    if (domain.keywords.has('login') || domain.keywords.has('auth')) files.add('apps/api/src/auth');

    // Generic
    if (files.size === 0) {
      if (lowerTitle.includes('api')) files.add('apps/api/src');
      if (lowerTitle.includes('staff') || lowerTitle.includes('portal')) files.add('apps/staff');
      if (lowerTitle.includes('scholar')) files.add('apps/scholar');
    }

    if (files.size === 0) files.add('apps/api/src/main.ts');

    return Array.from(files);
  }

  // Generate code snippet
  function generateCodeSnippet(title: string, domain: { keywords: Set<string>; isInstall: boolean }): string {
    const lowerTitle = title.toLowerCase();

    if (domain.keywords.has('helmet')) {
      return `import helmet from '@fastify/helmet';

await app.register(helmet, {
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});`;
    }

    if (domain.keywords.has('cors')) {
      return `import cors from '@fastify/cors';

await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
});`;
    }

    if (domain.keywords.has('pool')) {
      return `const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});`;
    }

    if (lowerTitle.includes('timeout')) {
      return `const timeout = 30000; // 30 seconds

app.get('/api/resource', async (req, reply) => {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);
  
  try {
    const result = await fetch(url, { signal: abortController.signal });
    return result.json();
  } finally {
    clearTimeout(timeoutId);
  }
});`;
    }

    if (domain.keywords.has('migrate') || domain.keywords.has('migration')) {
      return `import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function runMigrations() {
  const client = new Client(connectionConfig);
  await client.connect();
  
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  await client.end();
}

runMigrations().catch(console.error);`;
    }

    // Default snippet
    return `// Implement the required changes here
// Follow existing code patterns in the Ashinaga monorepo`;
  }

  // Dynamically generate description
  function generateDescription(title: string): string {
    const domain = inferDomain(title);
    const context = generateContext(domain);
    const severity = generateSeverity(domain);
    const files = inferFiles(title, domain);
    const codeSnippet = generateCodeSnippet(title, domain);

    let description = `## ${title}\n\n## Context\n\n${context}`;

    if (severity) {
      description += `\n\n**Severity**: ${severity}`;
    }

    description += `\n\n## Remediation\n\n`;
    if (domain.isInstall) {
      description += `Install and configure the required package. Register it in the appropriate module:\n\n\`\`\`ts\n${codeSnippet}\n\`\`\``;
    } else if (domain.isMigration) {
      description += `Execute the migration and update the application configuration:\n\n\`\`\`ts\n${codeSnippet}\n\`\`\``;
    } else if (domain.isFix) {
      description += `Apply the fix to resolve the issue:\n\n\`\`\`ts\n${codeSnippet}\n\`\`\``;
    } else {
      description += `Implement the required changes:\n\n\`\`\`ts\n${codeSnippet}\n\`\`\``;
    }

    description += `\n\n## Files to modify\n\n${files.map((f) => `- \`${f}\``).join('\n')}`;

    description += `\n\nGenerated by write-linear-ticket`;

    return description;
  }

  const description = generateDescription(title);

  const linearClient = new LinearClient({ apiKey });
  const result = await linearClient.createIssue({
    title,
    teamId: TEAM_ID,
    description,
  });

  if (!result.success || !result.issue) {
    throw new Error('Linear issue creation failed. Check API key, team ID, and permissions.');
  }

  const issue = await result.issue;
  const suggestedBranch = `feature/${issue.identifier.toLowerCase()}-${slugify(title)}`;

  console.log(`Created ticket: ${issue.identifier}`);
  console.log(`URL: ${issue.url}`);
  console.log(`Suggested branch: ${suggestedBranch}`);
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to create Linear issue: ${message}`);
  process.exit(1);
});
