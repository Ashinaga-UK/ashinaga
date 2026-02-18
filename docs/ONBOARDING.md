# Intern Onboarding Guide - Ashinaga Monorepo

Welcome to the Ashinaga project! This guide will help you get set up and start contributing, even if you're new to technologies like Node.js, PostgreSQL, and modern web development.

## Table of Contents

1. [Welcome & Overview](#welcome--overview)
2. [Prerequisites & Learning Resources](#prerequisites--learning-resources)
3. [Environment Setup](#environment-setup)
4. [Understanding the Codebase](#understanding-the-codebase)
5. [Development Workflow](#development-workflow)
6. [Your First Contribution](#your-first-contribution)
7. [Getting Help](#getting-help)

---

## Welcome & Overview

### What is Ashinaga?

Ashinaga is an international foundation providing educational and emotional support to orphaned students from 49 countries in sub-Saharan Africa who have lost one or both parents. This codebase is a platform that helps manage scholars, staff, tasks, goals, and various administrative functions.

### What You'll Be Working With

This is a **monorepo** (multiple projects in one repository) built with:

- **Backend API**: NestJS (Node.js framework) with PostgreSQL database
- **Frontend Apps**: Next.js (React framework) - Staff Portal and Scholar Portal
- **Package Manager**: pnpm (faster alternative to npm)
- **Database**: PostgreSQL (relational database)
- **TypeScript**: All code is written in TypeScript for type safety

### Project Structure

```
ashinaga/
├── apps/
│   ├── api/          # Backend API server (NestJS)
│   ├── staff/        # Staff portal (Next.js) - Port 3001
│   └── scholar/      # Scholar portal (Next.js) - Port 3002
├── packages/
│   ├── ui/           # Shared React components
│   └── ...           # Other shared packages
└── docs/             # Documentation (you're here!)
```

---

## Prerequisites & Learning Resources

If you're new to these technologies, don't worry! Here are the essential concepts you need to understand and where to learn them:

### 1. Node.js & npm/pnpm

**What it is**: Node.js lets you run JavaScript on your computer (not just in a browser). npm/pnpm are package managers that help you install and manage code libraries.

**Learn it**:
- [Node.js Official Guide](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs) - Start here!
- [npm vs pnpm](https://pnpm.io/motivation) - Why we use pnpm
- **Practice**: Try creating a simple Node.js script that prints "Hello World"

**Key Commands You'll Use**:
```bash
node --version        # Check Node.js version
pnpm install          # Install dependencies
pnpm add <package>    # Add a new package
```

### 2. PostgreSQL (Database)

**What it is**: A relational database that stores data in tables with relationships between them.

**Learn it**:
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html) - Official tutorial
- [SQL Basics](https://www.w3schools.com/sql/) - Learn SQL queries
- [PostgreSQL for Beginners](https://www.postgresqltutorial.com/) - Comprehensive guide
- **Practice**: Install PostgreSQL locally and create a simple table with users

**Key Concepts**:
- Tables, rows, columns
- Primary keys and foreign keys
- SELECT, INSERT, UPDATE, DELETE queries
- Relationships (one-to-many, many-to-many)

### 3. TypeScript

**What it is**: JavaScript with types - helps catch errors before running code.

**Learn it**:
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Official guide
- [TypeScript for JavaScript Programmers](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html) - Quick intro
- **Practice**: Convert a JavaScript file to TypeScript

**Key Concepts**:
- Types (string, number, boolean, object)
- Interfaces and types
- Functions with typed parameters
- Optional properties (`?`)

### 4. REST APIs

**What it is**: A way for frontend apps to communicate with backend servers using HTTP requests.

**Learn it**:
- [REST API Tutorial](https://restfulapi.net/) - Comprehensive guide
- [HTTP Methods Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) - GET, POST, PUT, DELETE
- **Practice**: Use Postman or curl to make API requests

**Key Concepts**:
- GET (read data)
- POST (create data)
- PUT/PATCH (update data)
- DELETE (remove data)
- HTTP status codes (200, 404, 500, etc.)

### 5. React & Next.js

**What it is**: React is a library for building user interfaces. Next.js is a framework built on React.

**Learn it**:
- [React Official Tutorial](https://react.dev/learn) - Start here!
- [Next.js Learn Course](https://nextjs.org/learn) - Official tutorial
- **Practice**: Build a simple todo app in React

**Key Concepts**:
- Components (reusable UI pieces)
- Props (passing data to components)
- State (managing data that changes)
- Hooks (useState, useEffect)
- Server vs Client components (Next.js)

### 6. Git & GitHub

**What it is**: Version control system for tracking code changes.

**Learn it**:
- [Git Handbook](https://guides.github.com/introduction/git-handbook/) - GitHub's guide
- [Learn Git Branching](https://learngitbranching.js.org/) - Interactive tutorial
- **Practice**: Create a GitHub repo and make your first commit

**Key Commands**:
```bash
git clone <repo>      # Download repository
git status            # Check what changed
git add .             # Stage changes
git commit -m "msg"   # Save changes
git push              # Upload changes
git pull              # Download latest changes
```

---

## Environment Setup

Follow these steps to get your development environment ready:

### Step 1: Install Required Software

#### Node.js (v18 or higher)

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Install it (follow the installer)
4. Verify installation:
   ```bash
   node --version  # Should show v18.x.x or higher
   npm --version   # Should show version number
   ```

#### pnpm (Package Manager)

1. Install pnpm globally:
   ```bash
   npm install -g pnpm
   ```
2. Verify installation:
   ```bash
   pnpm --version  # Should show v10.x.x or higher
   ```

#### Docker Desktop

**What it is**: Docker lets us run PostgreSQL in a container without installing it directly.

1. Visit [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Download Docker Desktop for your operating system
3. Install and start Docker Desktop
4. Verify it's running (you should see Docker icon in your system tray/menu bar)

#### Git

1. **macOS**: Usually pre-installed. Check with `git --version`
2. **Windows**: Download from [git-scm.com](https://git-scm.com/download/win)
3. **Linux**: `sudo apt-get install git` (Ubuntu/Debian)

#### Code Editor: Cursor (Recommended) or VS Code

1. Download [Cursor](https://cursor.sh/) (recommended) or [VS Code](https://code.visualstudio.com/)
2. Install recommended extensions:
   - Biome (for code formatting)
   - TypeScript and JavaScript Language Features
   - ESLint

### Step 2: Clone the Repository

1. Get the repository URL from your team lead
2. Clone it:
   ```bash
   git clone <repository-url>
   cd ashinaga
   ```

### Step 3: Install Dependencies

```bash
pnpm install
```

This will install all packages needed for all apps and packages in the monorepo. This might take a few minutes.

### Step 4: Set Up Environment Variables

#### API Environment Variables

1. Copy the example environment file:
   ```bash
   cd apps/api
   cp .env.example .env
   ```

2. Open `apps/api/.env` in your editor. The default values should work for local development:
   ```env
   DB_HOST=localhost
   DB_PORT=5433
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=postgres
   NODE_ENV=development
   PORT=4000
   BETTER_AUTH_SECRET=your-secret-key-here-min-32-chars-long-for-security
   BETTER_AUTH_URL=http://localhost:4000
   ```

   **Important**: Change `BETTER_AUTH_SECRET` to a random string at least 32 characters long (you can use any random text).

#### Staff App Environment Variables

1. Copy the example file:
   ```bash
   cd apps/staff
   cp .env.example .env.local
   ```

2. The default values should work:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   NEXT_PUBLIC_SCHOLAR_APP_URL=http://localhost:3002
   ```

#### Scholar App Environment Variables

1. Copy the example file:
   ```bash
   cd apps/scholar
   cp .env.example .env.local
   ```

2. The default values should work:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

### Step 5: Start the Database

From the root directory:

```bash
pnpm dev:db
```

This starts PostgreSQL in a Docker container. You should see:
```
✓ Container ashinaga-postgres-1  Started
```

**Troubleshooting**:
- If Docker isn't running, start Docker Desktop first
- If port 5433 is already in use, check what's using it: `lsof -i :5433`

### Step 6: Run Database Migrations

This sets up the database tables:

```bash
pnpm db:migrate
```

You should see migration messages indicating tables were created.

### Step 7: (Optional) Populate Development Data

To have sample data to work with:

```bash
cd apps/api
pnpm db:populate-dev
```

This creates sample scholars, staff, tasks, etc. for testing.

### Step 8: Start Development Servers

From the root directory:

```bash
pnpm dev
```

This starts all applications:
- **API**: http://localhost:4000 (or port specified in .env)
- **Staff Portal**: http://localhost:3001
- **Scholar Portal**: http://localhost:3002

**Note**: Keep this terminal open - it runs the servers in watch mode (auto-restarts on changes).

### Step 9: Verify Everything Works

1. **API Health Check**: Visit http://localhost:4000/health
   - Should return: `{"status":"ok",...}`

2. **API Documentation**: Visit http://localhost:4000/api
   - Should show Swagger UI with API endpoints

3. **Staff Portal**: Visit http://localhost:3001
   - Should load the staff portal

4. **Scholar Portal**: Visit http://localhost:3002
   - Should load the scholar portal

### Common Setup Issues

**Problem**: `pnpm install` fails
- **Solution**: Make sure Node.js v18+ is installed: `node --version`

**Problem**: Database connection errors
- **Solution**: Make sure Docker is running and `pnpm dev:db` completed successfully

**Problem**: Port already in use
- **Solution**: Find what's using the port and stop it, or change the port in `.env` files

**Problem**: TypeScript errors
- **Solution**: Run `pnpm build` from root to build packages first

---

## Understanding the Codebase

### Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Staff    │────────▶│     API     │◀────────│   Scholar   │
│   Portal   │  HTTP   │  (NestJS)   │  HTTP   │   Portal    │
│  (Next.js) │         │             │         │  (Next.js)  │
└─────────────┘         └──────┬──────┘         └─────────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │ PostgreSQL  │
                         │  Database   │
                         └─────────────┘
```

### Backend API Structure (`apps/api/`)

```
apps/api/
├── src/
│   ├── db/
│   │   ├── schema.ts          # Database table definitions
│   │   ├── connection.ts      # Database connection setup
│   │   └── migrations/        # Database migration files
│   ├── auth/                  # Authentication module
│   ├── scholars/              # Scholar management
│   ├── tasks/                 # Task management
│   ├── goals/                 # Goal management
│   ├── requests/              # Request management
│   ├── announcements/         # Announcements
│   ├── users/                 # User management
│   └── main.ts                # Application entry point
└── test/                      # Tests
```

**Key Files to Understand**:
- `src/db/schema.ts` - All database tables are defined here
- `src/main.ts` - Where the server starts
- Each module has: `*.controller.ts` (API endpoints), `*.service.ts` (business logic), `*.module.ts` (module configuration)

### Frontend Structure (`apps/staff/` and `apps/scholar/`)

```
apps/staff/
├── app/                       # Next.js app directory (pages)
│   ├── page.tsx              # Home page
│   └── scholars/             # Scholar-related pages
├── components/                # React components
├── lib/                      # Utility functions
│   └── api-client.ts         # API request helper
└── package.json
```

**Key Concepts**:
- `app/` directory contains pages (Next.js 13+ App Router)
- `components/` contains reusable React components
- `lib/api-client.ts` is used to make API calls

### Database Schema Overview

The database has these main tables:
- `users` - User accounts (staff and scholars)
- `scholars` - Scholar profiles
- `staff` - Staff profiles
- `tasks` - Tasks assigned to scholars
- `goals` - Goals set by scholars
- `requests` - Requests from scholars
- `announcements` - Announcements from staff

**Explore the Database**:
```bash
pnpm db:studio
```

This opens Drizzle Studio (database GUI) where you can browse tables and data.

### How Data Flows

1. **User Action** (e.g., clicking "Create Task" button)
   ↓
2. **Frontend** (`apps/staff/components/TaskForm.tsx`)
   - Calls API using `fetchAPI()` from `lib/api-client.ts`
   ↓
3. **API Endpoint** (`apps/api/src/tasks/tasks.controller.ts`)
   - Receives HTTP request
   ↓
4. **Service** (`apps/api/src/tasks/tasks.service.ts`)
   - Validates data, performs business logic
   ↓
5. **Database** (via Drizzle ORM)
   - Saves data to PostgreSQL
   ↓
6. **Response** flows back through the chain

---

## Development Workflow

### Daily Workflow

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**:
   - Edit files
   - Test locally
   - Run linter: `pnpm lint`

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Add: description of what you did"
   ```

5. **Push and create Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub (your team lead will review it).

### Code Quality Checks

Before committing, always run:

```bash
# Check for linting errors and auto-fix
pnpm lint

# Run tests
pnpm test

# Type check (if you modified TypeScript)
pnpm build
```

### Testing Your Changes

#### Backend API Testing

1. **Manual Testing with Swagger**:
   - Visit http://localhost:4000/api
   - Try endpoints directly in the browser

2. **Run Tests**:
   ```bash
   cd apps/api
   pnpm test              # Run all tests
   pnpm test:watch        # Watch mode (re-runs on changes)
   ```

#### Frontend Testing

1. **Manual Testing**:
   - Visit http://localhost:3001 (staff) or http://localhost:3002 (scholar)
   - Test the UI manually

2. **Run Tests**:
   ```bash
   cd apps/staff  # or apps/scholar
   pnpm test
   ```

### Database Changes

If you need to modify the database schema:

1. **Edit schema** (`apps/api/src/db/schema.ts`)
2. **Generate migration**:
   ```bash
   cd apps/api
   pnpm db:generate
   ```
3. **Apply migration**:
   ```bash
   pnpm db:migrate
   ```

**Important**: Never edit migration files directly. Always generate them.

### Useful Commands Reference

```bash
# From root directory
pnpm dev              # Start all apps
pnpm dev:db           # Start database
pnpm dev:down         # Stop database
pnpm build            # Build everything
pnpm test             # Run all tests
pnpm lint             # Check code quality
pnpm format           # Format code

# Database commands
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open database GUI
pnpm db:generate      # Generate migrations from schema changes

# Individual app commands
cd apps/api
pnpm dev              # Start API only
pnpm test:watch       # Run tests in watch mode
```

---

## Your First Contribution

Here are some starter tasks perfect for getting familiar with the codebase. Start with the easiest ones!

### 🟢 Beginner Tasks

#### Task 1: Add a Health Check Endpoint Enhancement

**Goal**: Add more information to the health check endpoint.

**Steps**:
1. Find `apps/api/src/health/health.controller.ts`
2. Add fields like `version`, `databaseStatus`, etc.
3. Test at http://localhost:4000/health
4. Write a simple test

**Learning**: Understanding controllers, endpoints, testing

**Estimated Time**: 1-2 hours

---

#### Task 2: Add Input Validation to an Endpoint

**Goal**: Add validation to ensure required fields are present.

**Steps**:
1. Pick an endpoint (e.g., `POST /api/tasks`)
2. Find the DTO (Data Transfer Object) file
3. Add validation decorators (`@IsString()`, `@IsNotEmpty()`, etc.)
4. Test with invalid data

**Learning**: NestJS validation, DTOs, error handling

**Estimated Time**: 2-3 hours

---

#### Task 3: Create a Simple "About" Page

**Goal**: Add an "About" page to the staff portal.

**Steps**:
1. Create `apps/staff/app/about/page.tsx`
2. Add basic information about Ashinaga
3. Add navigation link to the page
4. Style it nicely

**Learning**: Next.js pages, React components, routing

**Estimated Time**: 2-3 hours

---

#### Task 4: Add Error Messages to Forms

**Goal**: Improve form error handling in the frontend.

**Steps**:
1. Find a form component (e.g., task creation form)
2. Add error state handling
3. Display user-friendly error messages
4. Test with invalid submissions

**Learning**: React state, form handling, error handling

**Estimated Time**: 2-3 hours

---

### 🟡 Intermediate Tasks

#### Task 5: Add a "Last Updated" Field

**Goal**: Track when records were last modified.

**Steps**:
1. Add `updatedAt` field to a table in `schema.ts`
2. Generate and run migration
3. Update service to set `updatedAt` on updates
4. Update frontend to display it

**Learning**: Database migrations, schema changes, full-stack development

**Estimated Time**: 3-4 hours

---

#### Task 6: Add Search Functionality

**Goal**: Add search to a list page (e.g., scholars list).

**Steps**:
1. Add search input to the frontend
2. Add search query parameter to API endpoint
3. Implement search logic in service (SQL LIKE query)
4. Add debouncing to reduce API calls

**Learning**: API query parameters, database queries, React hooks

**Estimated Time**: 4-5 hours

---

#### Task 7: Add Pagination

**Goal**: Add pagination to a list endpoint.

**Steps**:
1. Add `page` and `limit` query parameters
2. Implement pagination in service (SQL LIMIT/OFFSET)
3. Return total count and page info
4. Add pagination UI to frontend

**Learning**: Pagination patterns, SQL, UI components

**Estimated Time**: 4-5 hours

---

### 🔴 Advanced Tasks (After You're Comfortable)

#### Task 8: Add Filtering

**Goal**: Add filters to a list (e.g., filter scholars by program).

**Steps**:
1. Add filter query parameters
2. Implement filtering in service
3. Add filter UI components
4. Handle multiple filters together

**Estimated Time**: 5-6 hours

---

#### Task 9: Add Export Functionality

**Goal**: Export data to CSV.

**Steps**:
1. Create export endpoint
2. Format data as CSV
3. Add export button to frontend
4. Handle file download

**Estimated Time**: 5-6 hours

---

### How to Approach a Task

1. **Read the task carefully** - Understand what's needed
2. **Explore the codebase** - Find similar features to learn from
3. **Plan your approach** - Break it into small steps
4. **Start coding** - Make small, testable changes
5. **Test frequently** - Test after each change
6. **Ask for help** - Don't hesitate to ask questions!
7. **Create PR** - Submit for review when done

### Code Review Process

1. **Create Pull Request** on GitHub
2. **Team lead reviews** - They'll check:
   - Code quality
   - Tests pass
   - No breaking changes
   - Follows project patterns
3. **Address feedback** - Make requested changes
4. **Merge** - Once approved, your code goes live!

**Remember**: Code reviews are learning opportunities. Don't take feedback personally!

---

## Getting Help

### When You're Stuck

1. **Check Documentation**:
   - This guide
   - `CLAUDE.md` in root (project-specific patterns)
   - `README.md` files in each app/package
   - Official docs (NestJS, Next.js, etc.)

2. **Search the Codebase**:
   - Look for similar features
   - See how things are done elsewhere
   - Use your editor's search (Cmd/Ctrl + Shift + F)

3. **Ask Your Team**:
   - Slack/Teams channel
   - Pair programming session
   - Code review questions

4. **Online Resources**:
   - [Stack Overflow](https://stackoverflow.com/) - Search for error messages
   - Official documentation (linked in Prerequisites section)
   - [MDN Web Docs](https://developer.mozilla.org/) - Web technologies reference

### Common Questions

**Q: My changes aren't showing up**
- Make sure the dev server restarted (check terminal)
- Hard refresh browser (Cmd/Ctrl + Shift + R)
- Check browser console for errors

**Q: Database connection error**
- Is Docker running? (`docker ps`)
- Is database started? (`pnpm dev:db`)
- Check `.env` file has correct values

**Q: TypeScript errors**
- Run `pnpm build` to see all errors
- Check if you need to install types: `pnpm add -D @types/package-name`

**Q: Tests failing**
- Read the error message carefully
- Check if you need to update test data
- Ask team lead if stuck

**Q: How do I know if my code is good?**
- Does it work? (manual testing)
- Do tests pass?
- Does `pnpm lint` pass?
- Does it follow patterns you see elsewhere?

### Learning Path Recommendations

**Week 1**: Focus on setup and understanding
- Complete environment setup
- Read through codebase
- Make small changes to see how things work
- Complete Task 1-2

**Week 2**: Start contributing
- Pick beginner tasks
- Ask lots of questions
- Complete Task 3-4

**Week 3-4**: Build confidence
- Try intermediate tasks
- Help others
- Complete Task 5-6

**Ongoing**: Keep learning
- Read code reviews carefully
- Learn from feedback
- Take on more complex tasks

---

## Additional Resources

### Project-Specific Documentation

- [`CLAUDE.md`](../CLAUDE.md) - Project architecture and patterns
- [`getting-started.md`](./getting-started.md) - Quick start guide
- [`apps/api/README.md`](../apps/api/README.md) - API documentation
- [`apps/staff/README.md`](../apps/staff/README.md) - Staff app docs
- [`apps/scholar/README.md`](../apps/scholar/README.md) - Scholar app docs

### Technology Documentation

- [NestJS Documentation](https://docs.nestjs.com/) - Backend framework
- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework
- [Drizzle ORM Documentation](https://orm.drizzle.team/) - Database ORM
- [React Documentation](https://react.dev/) - UI library
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - TypeScript guide
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Database

### Tools Documentation

- [pnpm Documentation](https://pnpm.io/) - Package manager
- [Docker Documentation](https://docs.docker.com/) - Containerization
- [Git Documentation](https://git-scm.com/doc) - Version control
- [Biome Documentation](https://biomejs.dev/) - Linter/formatter

---

## Checklist: Are You Ready to Contribute?

Before starting your first task, make sure you can:

- [ ] Run `pnpm dev` and see all apps running
- [ ] Access API docs at http://localhost:4000/api
- [ ] Access staff portal at http://localhost:3001
- [ ] Access scholar portal at http://localhost:3002
- [ ] Run `pnpm lint` without errors
- [ ] Run `pnpm test` and see tests pass
- [ ] Open database GUI with `pnpm db:studio`
- [ ] Create a git branch and make a commit
- [ ] Understand what a controller, service, and module are (NestJS)
- [ ] Understand what a component and page are (Next.js)
- [ ] Know how to make an API call from the frontend

If you can check all these boxes, you're ready! 🎉

---

## Final Notes

- **Take your time** - Learning takes time, and that's okay!
- **Ask questions** - There are no stupid questions
- **Start small** - Small contributions are valuable
- **Learn from code reviews** - Feedback helps you grow
- **Have fun** - You're building something meaningful!

Welcome to the team, and happy coding! 🚀
