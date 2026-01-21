import * as bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { generateInvitationToken } from '../auth/auth.config';
import * as schema from './schema';

// Generate Better Auth compatible IDs
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool, { schema });

// Idempotent upsert helpers
async function upsertUserByEmail(user: {
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  userType: 'staff' | 'scholar';
}) {
  const [result] = await db
    .insert(schema.users)
    .values({
      id: generateId(),
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified ?? false,
      image: user.image ?? undefined,
      userType: user.userType,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        name: user.name,
        emailVerified: user.emailVerified ?? false,
        image: user.image ?? undefined,
        userType: user.userType,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

async function upsertStaffByUserId(staff: {
  userId: string;
  role: 'admin' | 'viewer';
  phone?: string | null;
  department?: string | null;
  isActive?: boolean;
}) {
  const [result] = await db
    .insert(schema.staff)
    .values({
      userId: staff.userId,
      role: staff.role,
      phone: staff.phone ?? undefined,
      department: staff.department ?? undefined,
      isActive: staff.isActive ?? true,
    })
    .onConflictDoUpdate({
      target: schema.staff.userId,
      set: {
        role: staff.role,
        phone: staff.phone ?? undefined,
        department: staff.department ?? undefined,
        isActive: staff.isActive ?? true,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

async function upsertScholarByUserId(scholar: {
  userId: string;
  phone?: string | null;
  program: string;
  year: string;
  university: string;
  location?: string | null;
  startDate: Date;
  status: 'active' | 'inactive' | 'on_hold';
  lastActivity?: Date | null;
  bio?: string | null;
}) {
  const [result] = await db
    .insert(schema.scholars)
    .values({
      userId: scholar.userId,
      phone: scholar.phone ?? undefined,
      program: scholar.program,
      year: scholar.year,
      university: scholar.university,
      location: scholar.location ?? undefined,
      startDate: scholar.startDate,
      status: scholar.status,
      lastActivity: scholar.lastActivity ?? undefined,
      bio: scholar.bio ?? undefined,
    })
    .onConflictDoUpdate({
      target: schema.scholars.userId,
      set: {
        phone: scholar.phone ?? undefined,
        program: scholar.program,
        year: scholar.year,
        university: scholar.university,
        location: scholar.location ?? undefined,
        startDate: scholar.startDate,
        status: scholar.status,
        lastActivity: scholar.lastActivity ?? undefined,
        bio: scholar.bio ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

type TaskType =
  | 'document_upload'
  | 'form_completion'
  | 'meeting_attendance'
  | 'goal_update'
  | 'feedback_submission'
  | 'other';
type TaskPriority = 'high' | 'medium' | 'low';
type TaskStatus = 'pending' | 'in_progress' | 'completed';
type GoalCategory = 'academic_development' | 'personal_development' | 'professional_development';
type GoalStatus = 'pending' | 'in_progress' | 'completed';
type RequestType =
  | 'extenuating_circumstances'
  | 'summer_funding_request'
  | 'summer_funding_report'
  | 'requirement_submission';
type RequestPriority = 'high' | 'medium' | 'low';
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'reviewed' | 'commented';

// Row types
type ScholarRow = typeof schema.scholars.$inferSelect;
type TaskRow = typeof schema.tasks.$inferSelect;
type GoalRow = typeof schema.goals.$inferSelect;
type AnnouncementRow = typeof schema.announcements.$inferSelect;
type RequestRow = typeof schema.requests.$inferSelect;
type InvitationRow = typeof schema.invitations.$inferSelect;

async function ensureTask(input: {
  title: string;
  description?: string | null;
  type: TaskType;
  priority?: TaskPriority;
  dueDate: Date;
  status?: TaskStatus;
  scholarId: string;
  assignedBy: string;
  completedAt?: Date | null;
}) {
  const existing = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(and(eq(schema.tasks.title, input.title), eq(schema.tasks.scholarId, input.scholarId)));
  if (existing.length > 0) {
    const [updated] = await db
      .update(schema.tasks)
      .set({
        description: input.description ?? undefined,
        type: input.type,
        priority: input.priority ?? 'medium',
        dueDate: input.dueDate,
        status: input.status ?? 'pending',
        assignedBy: input.assignedBy,
        completedAt: input.completedAt ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.tasks.id, existing[0].id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(schema.tasks)
    .values({
      title: input.title,
      description: input.description ?? undefined,
      type: input.type,
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate,
      status: input.status ?? 'pending',
      scholarId: input.scholarId,
      assignedBy: input.assignedBy,
      completedAt: input.completedAt ?? undefined,
    })
    .returning();
  return created;
}

async function ensureGoal(input: {
  title: string;
  description?: string | null;
  category: GoalCategory;
  targetDate: Date;
  progress?: number;
  status?: GoalStatus;
  scholarId: string;
  completedAt?: Date | null;
}) {
  const existing = await db
    .select({ id: schema.goals.id })
    .from(schema.goals)
    .where(and(eq(schema.goals.title, input.title), eq(schema.goals.scholarId, input.scholarId)));
  if (existing.length > 0) {
    const [updated] = await db
      .update(schema.goals)
      .set({
        description: input.description ?? undefined,
        category: input.category,
        targetDate: input.targetDate,
        progress: input.progress ?? 0,
        status: input.status ?? 'pending',
        completedAt: input.completedAt ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.goals.id, existing[0].id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(schema.goals)
    .values({
      title: input.title,
      description: input.description ?? undefined,
      category: input.category,
      targetDate: input.targetDate,
      progress: input.progress ?? 0,
      status: input.status ?? 'pending',
      scholarId: input.scholarId,
      completedAt: input.completedAt ?? undefined,
    })
    .returning();
  return created;
}

async function ensureMilestone(input: {
  title: string;
  goalId: string;
  completed?: 'true' | 'false';
  completedDate?: Date | null;
}) {
  const existing = await db
    .select({ id: schema.milestones.id })
    .from(schema.milestones)
    .where(
      and(eq(schema.milestones.title, input.title), eq(schema.milestones.goalId, input.goalId))
    );
  if (existing.length > 0) {
    const [updated] = await db
      .update(schema.milestones)
      .set({
        completed: input.completed ?? 'false',
        completedDate: input.completedDate ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.milestones.id, existing[0].id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(schema.milestones)
    .values({
      title: input.title,
      goalId: input.goalId,
      completed: input.completed ?? 'false',
      completedDate: input.completedDate ?? undefined,
    })
    .returning();
  return created;
}

async function ensureAnnouncement(input: { title: string; content: string; createdBy: string }) {
  const existing = await db
    .select({ id: schema.announcements.id })
    .from(schema.announcements)
    .where(
      and(
        eq(schema.announcements.title, input.title),
        eq(schema.announcements.createdBy, input.createdBy)
      )
    );
  if (existing.length > 0) {
    const [updated] = await db
      .update(schema.announcements)
      .set({ content: input.content, updatedAt: new Date() })
      .where(eq(schema.announcements.id, existing[0].id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(schema.announcements)
    .values({ title: input.title, content: input.content, createdBy: input.createdBy })
    .returning();
  return created;
}

async function ensureAnnouncementFilter(input: {
  announcementId: string;
  filterType: string;
  filterValue: string;
}) {
  const existing = await db
    .select({ id: schema.announcementFilters.id })
    .from(schema.announcementFilters)
    .where(
      and(
        eq(schema.announcementFilters.announcementId, input.announcementId),
        eq(schema.announcementFilters.filterType, input.filterType),
        eq(schema.announcementFilters.filterValue, input.filterValue)
      )
    );
  if (existing.length > 0) {
    return existing[0];
  }
  const [created] = await db
    .insert(schema.announcementFilters)
    .values({
      announcementId: input.announcementId,
      filterType: input.filterType,
      filterValue: input.filterValue,
    })
    .returning();
  return created;
}

async function ensureAnnouncementRecipient(input: { announcementId: string; scholarId: string }) {
  const existing = await db
    .select({ id: schema.announcementRecipients.id })
    .from(schema.announcementRecipients)
    .where(
      and(
        eq(schema.announcementRecipients.announcementId, input.announcementId),
        eq(schema.announcementRecipients.scholarId, input.scholarId)
      )
    );
  if (existing.length > 0) {
    return existing[0];
  }
  const [created] = await db
    .insert(schema.announcementRecipients)
    .values({ announcementId: input.announcementId, scholarId: input.scholarId })
    .returning();
  return created;
}

async function ensureRequest(input: {
  scholarId: string;
  type: RequestType;
  description: string;
  priority?: RequestPriority;
  status?: RequestStatus;
  reviewedBy?: string | null;
  reviewComment?: string | null;
  reviewDate?: Date | null;
  submittedDate?: Date | null;
}) {
  const existing = await db
    .select({ id: schema.requests.id })
    .from(schema.requests)
    .where(
      and(
        eq(schema.requests.scholarId, input.scholarId),
        eq(schema.requests.type, input.type),
        eq(schema.requests.description, input.description)
      )
    );
  if (existing.length > 0) {
    const [updated] = await db
      .update(schema.requests)
      .set({
        priority: input.priority ?? 'medium',
        status: input.status ?? 'pending',
        reviewedBy: input.reviewedBy ?? undefined,
        reviewComment: input.reviewComment ?? undefined,
        reviewDate: input.reviewDate ?? undefined,
        submittedDate: input.submittedDate ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(schema.requests.id, existing[0].id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(schema.requests)
    .values({
      scholarId: input.scholarId,
      type: input.type,
      description: input.description,
      priority: input.priority ?? 'medium',
      status: input.status ?? 'pending',
      reviewedBy: input.reviewedBy ?? undefined,
      reviewComment: input.reviewComment ?? undefined,
      reviewDate: input.reviewDate ?? undefined,
      submittedDate: input.submittedDate ?? undefined,
    })
    .returning();
  return created;
}

async function ensureRequestAttachment(input: {
  requestId: string;
  name: string;
  size: string;
  url: string;
  mimeType: string;
}) {
  const existing = await db
    .select({ id: schema.requestAttachments.id })
    .from(schema.requestAttachments)
    .where(
      and(
        eq(schema.requestAttachments.requestId, input.requestId),
        eq(schema.requestAttachments.name, input.name)
      )
    );
  if (existing.length > 0) {
    return existing[0];
  }
  const [created] = await db.insert(schema.requestAttachments).values(input).returning();
  return created;
}

async function ensureRequestAuditLog(input: {
  requestId: string;
  action: string;
  performedBy: string;
  previousStatus?: RequestStatus | null;
  newStatus?: RequestStatus | null;
  comment?: string | null;
  metadata?: string | null;
}) {
  const existing = await db
    .select({ id: schema.requestAuditLogs.id })
    .from(schema.requestAuditLogs)
    .where(
      and(
        eq(schema.requestAuditLogs.requestId, input.requestId),
        eq(schema.requestAuditLogs.action, input.action),
        eq(schema.requestAuditLogs.comment, input.comment ?? '')
      )
    );
  if (existing.length > 0) {
    return existing[0];
  }
  const [created] = await db
    .insert(schema.requestAuditLogs)
    .values({
      requestId: input.requestId,
      action: input.action,
      performedBy: input.performedBy,
      previousStatus: input.previousStatus ?? undefined,
      newStatus: input.newStatus ?? undefined,
      comment: input.comment ?? undefined,
      metadata: input.metadata ?? undefined,
    })
    .returning();
  return created;
}

async function ensureDocument(input: {
  scholarId: string;
  name: string;
  type: string;
  mimeType: string;
  size: string;
  url: string;
  uploadedBy: string;
}) {
  const existing = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .where(
      and(eq(schema.documents.scholarId, input.scholarId), eq(schema.documents.name, input.name))
    );
  if (existing.length > 0) {
    return existing[0];
  }
  const [created] = await db.insert(schema.documents).values(input).returning();
  return created;
}

async function upsertInvitationByEmail(input: {
  email: string;
  userType: 'staff' | 'scholar';
  invitedBy: string;
  token: string;
  expiresAt: Date;
  sentAt?: Date | null;
  scholarData?: string | null;
  status?: 'pending' | 'accepted' | 'expired' | 'cancelled';
  userId?: string | null;
  acceptedAt?: Date | null;
}) {
  // Always use lowercase email for consistency with auth
  const emailLower = input.email.toLowerCase();

  const [result] = await db
    .insert(schema.invitations)
    .values({
      email: emailLower,
      userType: input.userType,
      invitedBy: input.invitedBy,
      token: input.token,
      expiresAt: input.expiresAt,
      sentAt: input.sentAt ?? undefined,
      scholarData: input.scholarData ?? undefined,
      status: input.status ?? 'pending',
      userId: input.userId ?? undefined,
      acceptedAt: input.acceptedAt ?? undefined,
    })
    .onConflictDoUpdate({
      target: schema.invitations.email,
      set: {
        userType: input.userType,
        invitedBy: input.invitedBy,
        token: input.token,
        expiresAt: input.expiresAt,
        sentAt: input.sentAt ?? undefined,
        scholarData: input.scholarData ?? undefined,
        status: input.status ?? 'pending',
        userId: input.userId ?? undefined,
        acceptedAt: input.acceptedAt ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

async function populateDevData() {
  console.log('🌱 Starting development data population...');

  try {
    // Idempotent mode: no destructive clears. We upsert/ensure records below.

    // Note: In production, Better Auth will handle password hashing
    // For dev data, we'll create a temporary hash for testing
    const _hashedPassword = await bcrypt.hash('password123', 10);

    // Note: We create system users with accepted invitations for consistency
    console.log('👥 Creating system admin user for seed data...');

    // First create the admin user (needed as invitedBy reference)
    const adminUser = await upsertUserByEmail({
      name: 'System Admin',
      email: 'system@ashinaga.org',
      emailVerified: true,
      image: null,
      userType: 'staff',
    });

    // Then create accepted invitation for system admin (self-invited for bootstrap)
    await upsertInvitationByEmail({
      email: 'system@ashinaga.org',
      userType: 'staff',
      invitedBy: adminUser.id, // self-invited for bootstrap
      token: generateInvitationToken(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expired yesterday
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'accepted',
      acceptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      userId: adminUser.id,
    });

    await upsertStaffByUserId({
      userId: adminUser.id,
      role: 'admin',
      phone: null,
      department: 'System',
      isActive: true,
    });

    // Create system viewer user
    const viewerUser = await upsertUserByEmail({
      name: 'System Viewer',
      email: 'system-viewer@ashinaga.org',
      emailVerified: true,
      image: null,
      userType: 'staff',
    });

    // Create accepted invitation for system viewer
    await upsertInvitationByEmail({
      email: 'system-viewer@ashinaga.org',
      userType: 'staff',
      invitedBy: adminUser.id,
      token: generateInvitationToken(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'accepted',
      acceptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      userId: viewerUser.id,
    });

    await upsertStaffByUserId({
      userId: viewerUser.id,
      role: 'viewer',
      phone: null,
      department: 'System',
      isActive: true,
    });

    // Create 30 diverse scholar users (idempotent)
    console.log('🎓 Creating scholars...');
    const universities = [
      'University of Oxford',
      'University of Cambridge',
      'Imperial College London',
      'London School of Economics',
      'University College London',
      'University of Edinburgh',
      'University of Manchester',
      "King's College London",
      'University of Warwick',
      'University of Bristol',
    ];
    const programs = [
      'Computer Science',
      'Medicine',
      'Engineering',
      'Economics',
      'International Relations',
      'Law',
      'Business',
      'Psychology',
      'Environmental Science',
      'Mathematics',
    ];
    const years = ['Pre-University', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Masters', 'PhD'];
    const statuses: Array<'active' | 'inactive' | 'on_hold'> = ['active', 'inactive', 'on_hold'];
    const locations = [
      'London, UK',
      'Oxford, UK',
      'Cambridge, UK',
      'Manchester, UK',
      'Edinburgh, UK',
      'Bristol, UK',
      'Birmingham, UK',
      'Leeds, UK',
      'Glasgow, UK',
      'Cardiff, UK',
      'Dublin, IE',
      'Paris, FR',
      'Berlin, DE',
      'Tokyo, JP',
      'Nairobi, KE',
      'Lagos, NG',
      'Accra, GH',
    ];
    const firstNames = [
      'Amara',
      'Kenji',
      'Fatima',
      'Carlos',
      'Priya',
      'Liam',
      'Olivia',
      'Noah',
      'Emma',
      'Ava',
      'Sophia',
      'Ethan',
      'Isabella',
      'Mia',
      'Lucas',
      'Mason',
      'Amelia',
      'James',
      'Benjamin',
      'Charlotte',
      'Henry',
      'Elijah',
      'Sofia',
      'Amina',
      'Yusuf',
      'Kwame',
      'Aisha',
      'Hiro',
      'Nadia',
      'Zara',
    ];
    const lastNames = [
      'Okafor',
      'Tanaka',
      'Al-Hassan',
      'Rodriguez',
      'Sharma',
      'Johnson',
      'Chen',
      'Williams',
      'Brown',
      'Davis',
      'Garcia',
      'Martinez',
      'Khan',
      'Singh',
      'Patel',
      'Osei',
      'Adams',
      'O’Connor',
      'Fraser',
      'Yamamoto',
      'Nakamura',
      'Silva',
      'Ibrahim',
      'Mensah',
      'Boateng',
      'Mwangi',
      'Abebe',
      'Novak',
      'Haddad',
      'Popov',
    ];

    const scholars: ScholarRow[] = [];
    const totalScholars = 30;
    for (let i = 0; i < totalScholars; i++) {
      const first = firstNames[i % firstNames.length];
      const last = lastNames[i % lastNames.length];
      const fullName = `${first} ${last}`;
      const emailLocal = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '');
      const email = `${emailLocal}${i}@example.com`;
      const program = programs[i % programs.length];
      const university = universities[(i + 3) % universities.length];
      const year = years[(i + 1) % years.length];
      const status = statuses[i % statuses.length];
      const location = locations[(i * 2) % locations.length];

      // Create scholar user first
      const user = await upsertUserByEmail({
        name: fullName,
        email,
        emailVerified: true, // All demo scholars have verified emails
        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(first)}`,
        userType: 'scholar',
      });

      // Then create accepted invitation for scholar
      await upsertInvitationByEmail({
        email,
        userType: 'scholar',
        invitedBy: adminUser.id,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // expired a week ago
        sentAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        status: 'accepted',
        acceptedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        userId: user.id,
        scholarData: JSON.stringify({
          program,
          year,
          university,
          location,
        }),
      });

      const scholar = await upsertScholarByUserId({
        userId: user.id,
        phone: undefined,
        program,
        year,
        university,
        location,
        startDate: new Date(`${(2019 + (i % 6)).toString()}-09-01`),
        status,
        lastActivity: new Date(Date.now() - (i % 31) * 24 * 60 * 60 * 1000),
        bio: undefined,
      });
      scholars.push(scholar);
    }

    // Create tasks
    console.log('📋 Creating tasks...');
    const taskResults: TaskRow[] = [];
    taskResults.push(
      await ensureTask({
        title: 'Submit Spring Term Transcript',
        description:
          'Please upload your official transcript for the Spring 2024 term. Ensure all grades are final.',
        type: 'document_upload',
        priority: 'high',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
        scholarId: scholars[0].id,
        assignedBy: adminUser.id,
      })
    );
    taskResults.push(
      await ensureTask({
        title: 'Complete Annual Feedback Survey',
        description:
          'Your feedback helps us improve our support services. Please complete the annual scholar satisfaction survey.',
        type: 'form_completion',
        priority: 'medium',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'pending',
        scholarId: scholars[0].id,
        assignedBy: adminUser.id,
      })
    );
    taskResults.push(
      await ensureTask({
        title: 'Attend Monthly Check-in Meeting',
        description:
          'Schedule and attend your monthly check-in with your assigned coordinator. Book a slot via the calendar link.',
        type: 'meeting_attendance',
        priority: 'medium',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
        scholarId: scholars[1].id,
        assignedBy: viewerUser.id,
      })
    );
    taskResults.push(
      await ensureTask({
        title: 'Upload Proof of Enrollment',
        description:
          'Please provide official documentation confirming your enrollment for the current academic year.',
        type: 'document_upload',
        priority: 'high',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'pending',
        scholarId: scholars[2].id,
        assignedBy: adminUser.id,
      })
    );
    taskResults.push(
      await ensureTask({
        title: 'Submit Monthly Progress Report',
        description:
          'Complete your monthly academic progress report including current grades and any challenges faced.',
        type: 'form_completion',
        priority: 'medium',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'completed',
        scholarId: scholars[3].id,
        assignedBy: adminUser.id,
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      })
    );

    // Create goals
    console.log('🎯 Creating goals...');
    const goals: GoalRow[] = [];
    goals.push(
      await ensureGoal({
        title: 'Achieve First Class Honours',
        description: 'Maintain a GPA above 3.7 throughout my degree program',
        category: 'academic_development',
        targetDate: new Date('2025-06-30'),
        progress: 75,
        status: 'in_progress',
        scholarId: scholars[0].id,
      })
    );
    goals.push(
      await ensureGoal({
        title: 'Complete Research Internship',
        description: 'Secure and complete a summer research internship at a leading AI lab',
        category: 'professional_development',
        targetDate: new Date('2024-08-31'),
        progress: 30,
        status: 'in_progress',
        scholarId: scholars[0].id,
      })
    );
    goals.push(
      await ensureGoal({
        title: 'Launch Campus Mental Health Initiative',
        description:
          'Establish a peer support network for international students struggling with mental health',
        category: 'personal_development',
        targetDate: new Date('2024-12-31'),
        progress: 60,
        status: 'in_progress',
        scholarId: scholars[1].id,
      })
    );
    goals.push(
      await ensureGoal({
        title: 'Publish Research Paper',
        description: 'Co-author and publish a research paper on sustainable water management',
        category: 'academic_development',
        targetDate: new Date('2024-05-31'),
        progress: 100,
        status: 'completed',
        scholarId: scholars[3].id,
        completedAt: new Date('2024-05-15'),
      })
    );

    // Create milestones
    console.log('🏁 Creating milestones...');
    await ensureMilestone({
      title: 'Complete all Year 2 core modules',
      goalId: goals[0].id,
      completed: 'true',
      completedDate: new Date('2024-05-20'),
    });
    await ensureMilestone({
      title: 'Achieve 80%+ in Machine Learning course',
      goalId: goals[0].id,
      completed: 'false',
    });
    await ensureMilestone({
      title: 'Submit internship applications',
      goalId: goals[1].id,
      completed: 'true',
      completedDate: new Date('2024-01-15'),
    });
    await ensureMilestone({
      title: 'Complete technical interviews',
      goalId: goals[1].id,
      completed: 'false',
    });
    await ensureMilestone({
      title: 'Recruit founding team members',
      goalId: goals[2].id,
      completed: 'true',
      completedDate: new Date('2024-02-01'),
    });
    await ensureMilestone({
      title: 'Launch pilot program with 20 students',
      goalId: goals[2].id,
      completed: 'false',
    });

    // Create announcements
    console.log('📢 Creating announcements...');
    const announcements: AnnouncementRow[] = [];
    announcements.push(
      await ensureAnnouncement({
        title: 'Summer Internship Opportunities Available',
        content:
          'We are excited to share new internship opportunities with our partner organizations. These positions are available in London, Tokyo, and New York. Please check your email for application details and deadlines.',
        createdBy: adminUser.id,
      })
    );
    announcements.push(
      await ensureAnnouncement({
        title: 'Annual Scholars Conference 2024',
        content:
          'Save the date! The Annual Ashinaga Scholars Conference will be held from July 15-17, 2024 in London. This year\'s theme is "Leadership in Action: Creating Sustainable Change". Registration opens next month.',
        createdBy: adminUser.id,
      })
    );
    announcements.push(
      await ensureAnnouncement({
        title: 'New Mental Health Support Services',
        content:
          'We are pleased to announce expanded mental health support services for all scholars. You can now access 24/7 counseling support through our new partnership with BetterHelp. Login details have been sent to your email.',
        createdBy: viewerUser.id,
      })
    );

    // Create announcement filters
    console.log('🔍 Creating announcement filters...');
    await ensureAnnouncementFilter({
      announcementId: announcements[0].id,
      filterType: 'year',
      filterValue: 'Year 2',
    });
    await ensureAnnouncementFilter({
      announcementId: announcements[0].id,
      filterType: 'year',
      filterValue: 'Year 3',
    });
    await ensureAnnouncementFilter({
      announcementId: announcements[0].id,
      filterType: 'year',
      filterValue: 'Year 4',
    });
    await ensureAnnouncementFilter({
      announcementId: announcements[2].id,
      filterType: 'status',
      filterValue: 'active',
    });

    // Create announcement recipients based on filters
    console.log('📮 Creating announcement recipients...');
    const targetYears = new Set(['Year 2', 'Year 3', 'Year 4']);
    for (const scholar of scholars) {
      if (scholar.year && targetYears.has(scholar.year)) {
        await ensureAnnouncementRecipient({
          announcementId: announcements[0].id,
          scholarId: scholar.id,
        });
      }
      await ensureAnnouncementRecipient({
        announcementId: announcements[1].id,
        scholarId: scholar.id,
      });
      if (scholar.status === 'active') {
        await ensureAnnouncementRecipient({
          announcementId: announcements[2].id,
          scholarId: scholar.id,
        });
      }
    }

    // Create requests
    console.log('📝 Creating requests...');
    const requests: RequestRow[] = [];
    requests.push(
      await ensureRequest({
        scholarId: scholars[0].id,
        type: 'summer_funding_request',
        description:
          'I am applying for summer funding to participate in a research internship at a partner university. The internship is for 10 weeks and will enhance my skills in AI and machine learning.',
        priority: 'high',
        status: 'pending',
      })
    );
    requests.push(
      await ensureRequest({
        scholarId: scholars[1].id,
        type: 'extenuating_circumstances',
        description:
          'I had to miss two weeks of classes due to a family emergency back home. I am requesting consideration for assignment deadline extensions.',
        priority: 'high',
        status: 'approved',
        reviewedBy: adminUser.id,
        reviewComment:
          'Extensions granted for all assignments due during the affected period. Please coordinate with your professors.',
        reviewDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        submittedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      })
    );
    requests.push(
      await ensureRequest({
        scholarId: scholars[2].id,
        type: 'requirement_submission',
        description:
          'I am submitting my updated transcript for the current academic year. All modules have been completed successfully.',
        priority: 'medium',
        status: 'reviewed',
        reviewedBy: viewerUser.id,
        reviewComment: 'Transcript received and verified. Thank you for the submission.',
        reviewDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      })
    );

    // Create request attachments
    console.log('📎 Creating request attachments...');
    await ensureRequestAttachment({
      requestId: requests[0].id,
      name: 'laptop_invoice_estimate.pdf',
      size: '245 KB',
      url: 'https://example-bucket.s3.amazonaws.com/requests/laptop_invoice_estimate.pdf',
      mimeType: 'application/pdf',
    });
    await ensureRequestAttachment({
      requestId: requests[1].id,
      name: 'medical_certificate.pdf',
      size: '156 KB',
      url: 'https://example-bucket.s3.amazonaws.com/requests/medical_certificate.pdf',
      mimeType: 'application/pdf',
    });

    // Create request audit logs
    console.log('📜 Creating request audit logs...');
    await ensureRequestAuditLog({
      requestId: requests[0].id,
      action: 'created',
      performedBy: adminUser.id,
      comment: 'Financial support request submitted',
    });
    await ensureRequestAuditLog({
      requestId: requests[1].id,
      action: 'created',
      performedBy: adminUser.id,
      comment: 'Extenuating circumstances request submitted',
    });
    await ensureRequestAuditLog({
      requestId: requests[1].id,
      action: 'status_changed',
      performedBy: adminUser.id,
      previousStatus: 'pending',
      newStatus: 'approved',
      comment: 'Request approved with deadline extensions granted',
    });
    await ensureRequestAuditLog({
      requestId: requests[2].id,
      action: 'created',
      performedBy: viewerUser.id,
      comment: 'Academic support request submitted',
    });
    await ensureRequestAuditLog({
      requestId: requests[2].id,
      action: 'status_changed',
      performedBy: viewerUser.id,
      previousStatus: 'pending',
      newStatus: 'reviewed',
      comment: 'Arranged statistics support group enrollment',
    });

    // Create documents
    console.log('📄 Creating documents...');
    await ensureDocument({
      scholarId: scholars[0].id,
      name: 'Fall_2023_Transcript.pdf',
      type: 'transcript',
      mimeType: 'application/pdf',
      size: '512 KB',
      url: 'https://example-bucket.s3.amazonaws.com/documents/fall_2023_transcript.pdf',
      uploadedBy: adminUser.id,
    });
    await ensureDocument({
      scholarId: scholars[0].id,
      name: 'Enrollment_Certificate_2024.pdf',
      type: 'certificate',
      mimeType: 'application/pdf',
      size: '128 KB',
      url: 'https://example-bucket.s3.amazonaws.com/documents/enrollment_cert_2024.pdf',
      uploadedBy: adminUser.id,
    });
    await ensureDocument({
      scholarId: scholars[1].id,
      name: 'Medical_School_Progress_Report.pdf',
      type: 'report',
      mimeType: 'application/pdf',
      size: '256 KB',
      url: 'https://example-bucket.s3.amazonaws.com/documents/medical_progress_report.pdf',
      uploadedBy: viewerUser.id,
    });
    await ensureDocument({
      scholarId: scholars[3].id,
      name: 'Research_Publication_Draft.pdf',
      type: 'report',
      mimeType: 'application/pdf',
      size: '1.2 MB',
      url: 'https://example-bucket.s3.amazonaws.com/documents/research_publication.pdf',
      uploadedBy: adminUser.id,
    });

    // Create invitations for real staff members
    console.log('📧 Creating staff invitations...');
    const invitations: InvitationRow[] = [];

    // Real Ashinaga staff invitations
    invitations.push(
      await upsertInvitationByEmail({
        email: 'kimeshan@gmail.com',
        userType: 'staff',
        invitedBy: adminUser.id,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        sentAt: new Date(),
      })
    );

    invitations.push(
      await upsertInvitationByEmail({
        email: 'mcfarlane.j@ashinaga.org',
        userType: 'staff',
        invitedBy: adminUser.id,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        sentAt: new Date(),
      })
    );

    invitations.push(
      await upsertInvitationByEmail({
        email: 'chukwu.o@ashinaga.org',
        userType: 'staff',
        invitedBy: adminUser.id,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        sentAt: new Date(),
      })
    );

    invitations.push(
      await upsertInvitationByEmail({
        email: 'harty.s@ashinaga.org',
        userType: 'staff',
        invitedBy: adminUser.id,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        sentAt: new Date(),
      })
    );

    // Demo scholar invitation
    invitations.push(
      await upsertInvitationByEmail({
        email: 'new.scholar@example.com',
        userType: 'scholar',
        invitedBy: adminUser.id,
        token: generateInvitationToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        sentAt: new Date(),
        scholarData: JSON.stringify({
          program: 'Engineering',
          year: '2025',
          university: 'University of Manchester',
          location: 'Manchester, UK',
        }),
      })
    );

    console.log('✅ Development data populated successfully!');
    console.log(`Created or updated:
    - ${2} system users for seed data (not for login)
    - ${scholars.length} scholars
    - ${taskResults.length} tasks
    - ${goals.length} goals with milestones
    - ${announcements.length} announcements
    - ${requests.length} requests with attachments and audit logs
    - ${4} documents
    - ${invitations.length} invitations`);

    console.log('\n📧 Staff invitations created for:');
    console.log('- kimeshan@gmail.com');
    console.log('- mcfarlane.j@ashinaga.org');
    console.log('- chukwu.o@ashinaga.org');
    console.log('- harty.s@ashinaga.org');
    console.log('\nStaff members should use these invitations to sign up via the invite link.');

    console.log('\n🎓 Test data:');
    console.log('- 30 demo scholars created (amara.okafor0@example.com, etc.)');
    console.log('- Sample scholar invitation: new.scholar@example.com');
    console.log('\nPasswords will be set when users sign up through Better Auth.');
  } catch (error) {
    console.error('❌ Development data population failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Only run if called directly (not imported)
if (require.main === module) {
  // Check environment
  const env = process.env.NODE_ENV || 'development';

  if (env === 'production') {
    console.error('❌ ERROR: This script should NOT be run in production!');
    console.error('This is for development and test environments only.');
    process.exit(1);
  }

  console.log(`🚀 Running in ${env} environment`);

  populateDevData().catch((error) => {
    console.error('Fatal error during data population:', error);
    process.exit(1);
  });
}

export { populateDevData };
