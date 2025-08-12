# Ashinaga API Implementation Plan with Better Auth

## Overview
This document outlines the implementation plan for the Ashinaga API using:
- **Better Auth** for authentication (JWT-based)
- **NestJS with Fastify** for the API framework
- **PostgreSQL with Drizzle ORM** for data persistence
- **RESTful conventions** for API design

## Database Architecture

### User Management Structure
```
┌─────────────────┐
│      user       │  ← Better Auth manages this table
├─────────────────┤
│ id              │
│ name            │
│ email           │
│ emailVerified   │
│ image           │
│ userType        │  ← 'staff' | 'scholar'
│ createdAt       │
│ updatedAt       │
└─────────────────┘
        │
        ├────────────────┬────────────────┐
        ▼                ▼                │
┌──────────────┐ ┌──────────────┐        │
│    staff     │ │   scholars   │        │
├──────────────┤ ├──────────────┤        │
│ id           │ │ id           │        │
│ userId (FK)  │ │ userId (FK)  │        │
│ role         │ │ program      │        │
│ department   │ │ year         │        │
│ phone        │ │ university   │        │
│ isActive     │ │ status       │        │
└──────────────┘ └──────────────┘        │
                                          │
┌──────────────┐ ┌──────────────┐        │
│   account    │ │   session    │ ← Better Auth tables
├──────────────┤ ├──────────────┤
│ userId (FK)  │ │ userId (FK)  │
│ provider     │ │ token        │
│ ...          │ │ expiresAt    │
└──────────────┘ └──────────────┘
```

## Authentication Setup

### 1. Better Auth Configuration
```typescript
// auth.config.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins/jwt";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      account: accounts,
      session: sessions,
    }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // For MVP
  },
  socialProviders: {
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      tenant: "common", // Allow any Microsoft account
    }
  },
  plugins: [jwt()],
  callbacks: {
    user: {
      create: async ({ user }) => {
        // Determine user type based on email domain
        const userType = user.email.endsWith('@ashinaga.org') ? 'staff' : 'scholar';
        return { ...user, userType };
      }
    }
  }
});
```

### 2. Authorization Strategy
- **Authentication**: Handled by Better Auth (who are you?)
- **Authorization**: Custom implementation (what can you do?)

```typescript
// Custom authorization guards
@Injectable()
export class RolesGuard implements CanActivate {
  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // From Better Auth
    
    // Check user type
    if (user.userType === 'staff') {
      const staffMember = await getStaffByUserId(user.id);
      return staffMember.role === 'admin'; // For admin-only routes
    }
    
    return false;
  }
}
```

## API Implementation Plan

### Phase 1: Core Setup (Days 1-2)
1. **Better Auth Integration**
   - Install and configure Better Auth
   - Set up JWT plugin
   - Configure Microsoft OAuth
   - Create auth endpoints wrapper

2. **Database Migration**
   - Update schema with new user structure
   - Create staff and scholar relationships
   - Run migrations

3. **Auth Module**
   ```typescript
   // Endpoints provided by Better Auth
   POST   /api/auth/signup
   POST   /api/auth/signin
   POST   /api/auth/signout
   GET    /api/auth/user
   POST   /api/auth/microsoft
   ```

4. **Custom Auth Endpoints**
   ```typescript
   POST   /api/auth/onboard-staff    // Create staff profile after signup
   POST   /api/auth/onboard-scholar  // Create scholar profile after signup
   GET    /api/auth/profile          // Get full profile (user + staff/scholar)
   ```

### Phase 2: Core CRUD Operations (Days 3-5)

#### Scholar Management
```typescript
GET    /api/scholars              // List with filters
GET    /api/scholars/:id          // Get by ID with relations
PUT    /api/scholars/:id          // Update scholar
POST   /api/scholars/bulk-import  // CSV import
POST   /api/scholars/invite       // Send invitations

// DTO Examples
class ScholarResponseDto {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  program: string;
  year: string;
  university: string;
  status: string;
  // ... other scholar fields
}
```

#### Staff Management
```typescript
GET    /api/staff                 // List all staff
GET    /api/staff/:id            // Get staff member
PUT    /api/staff/:id            // Update staff (Admin only)
PUT    /api/staff/:id/role       // Update role (Admin only)
```

### Phase 3: Feature Implementation (Days 6-10)

#### Task Management
```typescript
GET    /api/tasks                 // List with filters
POST   /api/tasks                 // Create task
POST   /api/tasks/bulk            // Bulk assign
PUT    /api/tasks/:id             // Update task
DELETE /api/tasks/:id             // Delete task
```

#### Goal Management
```typescript
GET    /api/goals                 // List goals
POST   /api/goals                 // Create goal (by scholar)
PUT    /api/goals/:id             // Update goal
POST   /api/goals/:id/milestones  // Add milestone
PUT    /api/milestones/:id        // Update milestone
```

#### Request Management
```typescript
GET    /api/requests              // List requests
POST   /api/requests              // Create request (by scholar)
PUT    /api/requests/:id          // Update/review request
POST   /api/requests/:id/comment  // Add comment
```

#### Announcements
```typescript
POST   /api/announcements         // Create announcement
GET    /api/announcements         // List announcements
GET    /api/announcements/:id/recipients  // Get recipients
```

### Phase 4: Advanced Features (Days 11-14)

1. **File Uploads**
   - S3 integration for documents
   - Image optimization for avatars
   - Secure file access with pre-signed URLs

2. **Real-time Updates**
   - WebSocket setup for notifications
   - Live task updates
   - Announcement broadcasts

3. **Analytics & Dashboard**
   - Aggregated statistics
   - Activity feeds
   - Performance metrics

## Frontend Integration

### 1. API Client Setup
```typescript
// api/client.ts
import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Custom API client for other endpoints
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Add auth interceptor
apiClient.interceptors.request.use(async (config) => {
  const session = await authClient.getSession();
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});
```

### 2. Authentication Flow
```typescript
// Login
const { data, error } = await authClient.signIn.email({
  email: "user@ashinaga.org",
  password: "password",
});

// Microsoft SSO
await authClient.signIn.social({
  provider: "microsoft",
});

// Get current user
const user = await authClient.getUser();
```

### 3. Data Fetching Pattern
```typescript
// Using React Query
const { data: scholars } = useQuery({
  queryKey: ['scholars', filters],
  queryFn: () => apiClient.get('/api/scholars', { params: filters }),
});
```

## Security Considerations

1. **Authentication**
   - JWT tokens with short expiration (15 min)
   - Refresh token rotation
   - Secure cookie storage option

2. **Authorization**
   - Role-based access (Admin/Viewer for staff)
   - Resource-based access (scholars can only update their own data)
   - API endpoint protection with guards

3. **Data Protection**
   - Input validation with DTOs
   - SQL injection prevention (Drizzle ORM)
   - XSS protection
   - Rate limiting

## Development Workflow

### Week 1: Foundation
- Day 1-2: Better Auth setup & database migration
- Day 3-4: Scholar CRUD operations
- Day 5: Staff management & authorization

### Week 2: Features
- Day 6-7: Task management system
- Day 8-9: Goals & milestones
- Day 10: Request handling

### Week 3: Polish
- Day 11-12: File uploads & announcements
- Day 13-14: Dashboard, testing & optimization

## Key Benefits of This Approach

1. **Better Auth Advantages**
   - Battle-tested authentication
   - Built-in Microsoft SSO
   - JWT management handled
   - Session handling
   - Security best practices

2. **Clean Architecture**
   - Separation of authentication and user data
   - Flexible authorization system
   - Type-safe with TypeScript
   - Scalable structure

3. **Developer Experience**
   - Less code to maintain
   - Focus on business logic
   - Great documentation
   - Active community

## Next Steps

1. Install Better Auth dependencies
2. Update database schema
3. Configure Better Auth
4. Create authorization guards
5. Implement first API endpoints
6. Update frontend to use new auth

This approach gives us enterprise-grade authentication while maintaining flexibility for our specific authorization needs.