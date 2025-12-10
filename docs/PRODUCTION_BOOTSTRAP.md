# Production Bootstrap Guide

This guide explains how to set up the initial staff members and check seeding requirements after deploying to production.

## Overview

After deploying to production, you need to:
1. **Create the first admin staff member** - This bootstraps the system
   - ⚠️ **Important**: The invitation endpoint (`POST /api/invitations`) DOES support creating staff invitations, BUT all staff created via invitations get `role: 'viewer'` by default. The bootstrap script is needed to create the first `admin` role user.
2. **Check seeding requirements** - Universities and countries are free-form text fields (no seeding needed)

## Step 1: Create First Admin Staff Member

The invitation endpoint (`POST /api/invitations`) requires staff authentication, which creates a chicken-and-egg problem. To solve this, we have a bootstrap script.

### Option A: Run Bootstrap Script Locally

1. **Set up database connection environment variables:**
   ```bash
   export DB_HOST=<your-production-db-host>
   export DB_PORT=5432
   export DB_NAME=ashinaga_prod
   export DB_USER=dbadmin
   export DB_PASSWORD=<your-db-password>
   export NODE_ENV=production
   export BETTER_AUTH_URL=https://api.ashinaga-uk.org
   ```

2. **Get the database password from AWS Secrets Manager:**
   ```bash
   # Using AWS CLI (if you have access)
   aws secretsmanager get-secret-value \
     --secret-id <secret-arn> \
     --query SecretString \
     --output text
   ```

3. **Run the bootstrap script:**
   ```bash
   cd apps/api
   pnpm db:bootstrap-prod <staff-email@example.com>
   
   # Or with environment variable:
   STAFF_EMAIL=admin@ashinaga-uk.org pnpm db:bootstrap-prod
   ```

### Option B: Run Bootstrap Script via AWS Systems Manager Session Manager

If you have AWS Systems Manager access to your production environment:

1. **Start a session to your App Runner instance or EC2 instance**
2. **Set environment variables** (they should already be set in App Runner)
3. **Run the bootstrap script**

### Option C: Direct Database Access

If you have direct database access, you can manually insert the records:

```sql
-- 1. Create user (replace with actual email)
INSERT INTO "user" (id, name, email, "emailVerified", "userType", "createdAt", "updatedAt")
VALUES (
  'YOUR_GENERATED_32_CHAR_ID',
  'Admin User',
  'admin@ashinaga-uk.org',
  false,
  'staff',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET "userType" = 'staff';

-- 2. Create staff record (use the user ID from above)
INSERT INTO staff ("userId", role, "isActive", "createdAt", "updatedAt")
VALUES (
  'YOUR_GENERATED_32_CHAR_ID',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("userId") DO UPDATE SET role = 'admin';

-- 3. Create invitation (generate a secure random token)
INSERT INTO invitations (
  id, email, "userType", "invitedBy", token, "expiresAt", 
  status, "resentCount", "sentAt", "createdAt", "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'admin@ashinaga-uk.org',
  'staff',
  'YOUR_GENERATED_32_CHAR_ID',
  'GENERATE_SECURE_RANDOM_TOKEN', -- Use generateInvitationToken() logic
  NOW() + INTERVAL '30 days',
  'pending',
  '0',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET 
  token = EXCLUDED.token,
  "expiresAt" = EXCLUDED."expiresAt",
  status = 'pending';
```

## Step 2: Send Invitation to First Admin

After running the bootstrap script, you'll get an invitation URL. Send this to the first admin:

```
https://api.ashinaga-uk.org/auth/signup?token=<TOKEN>&email=<EMAIL>
```

The admin should:
1. Click the invitation link
2. Complete signup with their password
3. Log in to the staff dashboard at `https://staff.ashinaga-uk.org`

## Step 3: Invite Additional Staff

Once the first admin is logged in, they can invite additional staff using the API:

```bash
POST https://api.ashinaga-uk.org/api/invitations
Authorization: Bearer <admin-auth-token>
Content-Type: application/json

{
  "email": "staff@ashinaga-uk.org",
  "userType": "staff"
}
```

Or use the staff dashboard UI to invite staff members.

**Note**: Staff members created via invitations will have `role: 'viewer'` by default. To promote them to `admin`, you'll need to update their role in the database or add an admin promotion endpoint.

## Seeding Requirements

### Universities and Countries

**Good news:** Universities and countries are stored as **free-form text fields** in the `scholars` table. There's no separate reference table, so **no seeding is required**.

- Universities are stored in `scholars.university` (text field)
- Countries are stored in:
  - `scholars.address_home_country` (text field)
  - `scholars.emergency_contact_country_of_study` (text field)
  - `scholars.emergency_contact_home_country` (text field)

As staff members add scholars, they can enter any university or country name. The system will:
- Display them in dropdowns based on existing scholar data
- Allow filtering by these values
- Store them as text (no validation against a reference list)

### Other Data

No other seeding is required for production. The system starts with a blank database and data is added organically as:
- Staff members invite scholars
- Scholars complete their profiles
- Staff create goals, tasks, announcements, etc.

## Troubleshooting

### "Staff members already exist"

If you see this message, the bootstrap has already been run. You can:
- Use the invitation endpoint to invite more staff (requires existing staff login)
- Or manually create invitations via direct database access

### "No invitation found for this email"

This means the invitation wasn't created or has expired. Check:
1. The invitation exists in the database
2. The invitation status is 'pending'
3. The invitation hasn't expired
4. The email matches exactly (case-insensitive)

### Database Connection Issues

If you can't connect to the production database:
1. Check your AWS credentials and permissions
2. Verify the database is publicly accessible (if connecting from outside AWS)
3. Check security group rules allow your IP
4. Verify database credentials in AWS Secrets Manager

## Security Notes

- The bootstrap script creates a single admin user - use this carefully
- After creating the first admin, remove or restrict access to the bootstrap script
- Consider adding IP whitelisting for the bootstrap endpoint if you create one
- Store invitation tokens securely - they provide access to create accounts
