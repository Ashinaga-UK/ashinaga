import * as bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5433,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
});

const db = drizzle(pool, { schema });

async function populateDevData() {
  console.log('🌱 Starting development data population...');

  try {
    // Clear existing data in the correct order
    console.log('🧹 Clearing existing data...');
    await db.delete(schema.requestAuditLogs);
    await db.delete(schema.requestAttachments);
    await db.delete(schema.requests);
    await db.delete(schema.documents);
    await db.delete(schema.milestones);
    await db.delete(schema.goals);
    await db.delete(schema.tasks);
    await db.delete(schema.announcementRecipients);
    await db.delete(schema.announcementFilters);
    await db.delete(schema.announcements);
    await db.delete(schema.scholars);
    await db.delete(schema.staff);
    await db.delete(schema.sessions);
    await db.delete(schema.accounts);
    await db.delete(schema.users);

    // Note: In production, Better Auth will handle password hashing
    // For dev data, we'll create a temporary hash for testing
    const _hashedPassword = await bcrypt.hash('password123', 10);

    // Create staff users
    console.log('👥 Creating staff users...');

    // Admin user
    const [adminUser] = await db
      .insert(schema.users)
      .values({
        name: 'Sarah Johnson',
        email: 'sarah.johnson@ashinaga.org',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        userType: 'staff',
      })
      .returning();

    const [_adminStaff] = await db
      .insert(schema.staff)
      .values({
        userId: adminUser.id,
        role: 'admin',
        phone: '+44 20 1234 5678',
        department: 'Scholar Support',
        isActive: true,
      })
      .returning();

    // Viewer user
    const [viewerUser] = await db
      .insert(schema.users)
      .values({
        name: 'Michael Chen',
        email: 'michael.chen@ashinaga.org',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
        userType: 'staff',
      })
      .returning();

    const [_viewerStaff] = await db
      .insert(schema.staff)
      .values({
        userId: viewerUser.id,
        role: 'viewer',
        phone: '+44 20 1234 5679',
        department: 'Academic Affairs',
        isActive: true,
      })
      .returning();

    // Create scholar users
    console.log('🎓 Creating scholars...');

    // Scholar 1
    const [scholar1User] = await db
      .insert(schema.users)
      .values({
        name: 'Amara Okafor',
        email: 'amara.okafor@example.com',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amara',
        userType: 'scholar',
      })
      .returning();

    const [scholar1] = await db
      .insert(schema.scholars)
      .values({
        userId: scholar1User.id,
        phone: '+234 123 456 7890',
        program: 'Computer Science',
        year: 'Year 2',
        university: 'University of Oxford',
        location: 'Oxford, UK',
        startDate: new Date('2022-09-01'),
        status: 'active',
        lastActivity: new Date(),
        bio: 'Passionate about AI and machine learning. Aspiring to use technology to solve healthcare challenges in Africa.',
      })
      .returning();

    // Scholar 2
    const [scholar2User] = await db
      .insert(schema.users)
      .values({
        name: 'Kenji Tanaka',
        email: 'kenji.tanaka@example.com',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kenji',
        userType: 'scholar',
      })
      .returning();

    const [scholar2] = await db
      .insert(schema.scholars)
      .values({
        userId: scholar2User.id,
        phone: '+81 90 1234 5678',
        program: 'Medicine',
        year: 'Year 3',
        university: 'Imperial College London',
        location: 'London, UK',
        startDate: new Date('2021-09-01'),
        status: 'active',
        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        bio: 'Future doctor dedicated to improving rural healthcare access. Interested in telemedicine innovations.',
      })
      .returning();

    // Scholar 3
    const [scholar3User] = await db
      .insert(schema.users)
      .values({
        name: 'Fatima Al-Hassan',
        email: 'fatima.alhassan@example.com',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
        userType: 'scholar',
      })
      .returning();

    const [scholar3] = await db
      .insert(schema.scholars)
      .values({
        userId: scholar3User.id,
        phone: '+962 79 123 4567',
        program: 'International Relations',
        year: 'Year 1',
        university: 'London School of Economics',
        location: 'London, UK',
        startDate: new Date('2023-09-01'),
        status: 'active',
        lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        bio: 'Committed to refugee advocacy and international humanitarian law. Fluent in Arabic, English, and French.',
      })
      .returning();

    // Scholar 4
    const [scholar4User] = await db
      .insert(schema.users)
      .values({
        name: 'Carlos Rodriguez',
        email: 'carlos.rodriguez@example.com',
        emailVerified: true,
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
        userType: 'scholar',
      })
      .returning();

    const [scholar4] = await db
      .insert(schema.scholars)
      .values({
        userId: scholar4User.id,
        phone: '+52 55 1234 5678',
        program: 'Environmental Science',
        year: 'Year 4',
        university: 'University of Edinburgh',
        location: 'Edinburgh, UK',
        startDate: new Date('2020-09-01'),
        status: 'active',
        lastActivity: new Date(),
        bio: 'Environmental activist focusing on sustainable development in Latin America. Leading campus sustainability initiatives.',
      })
      .returning();

    // Scholar 5
    const [scholar5User] = await db
      .insert(schema.users)
      .values({
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com',
        emailVerified: false, // Not yet verified
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
        userType: 'scholar',
      })
      .returning();

    const [scholar5] = await db
      .insert(schema.scholars)
      .values({
        userId: scholar5User.id,
        phone: '+91 98765 43210',
        program: 'Economics',
        year: 'Pre-University',
        university: 'Cambridge Pre-U',
        location: 'Cambridge, UK',
        startDate: new Date('2023-09-01'),
        status: 'on_hold',
        lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        bio: 'Aspiring economist interested in microfinance and poverty alleviation strategies.',
      })
      .returning();

    const scholars = [scholar1, scholar2, scholar3, scholar4, scholar5];

    // Create tasks
    console.log('📋 Creating tasks...');
    const tasks = await db
      .insert(schema.tasks)
      .values([
        {
          title: 'Submit Spring Term Transcript',
          description:
            'Please upload your official transcript for the Spring 2024 term. Ensure all grades are final.',
          type: 'document_upload',
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          status: 'pending',
          scholarId: scholars[0].id,
          assignedBy: adminUser.id,
        },
        {
          title: 'Complete Annual Feedback Survey',
          description:
            'Your feedback helps us improve our support services. Please complete the annual scholar satisfaction survey.',
          type: 'form_completion',
          priority: 'medium',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
          status: 'pending',
          scholarId: scholars[0].id,
          assignedBy: adminUser.id,
        },
        {
          title: 'Attend Monthly Check-in Meeting',
          description:
            'Schedule and attend your monthly check-in with your assigned coordinator. Book a slot via the calendar link.',
          type: 'meeting_attendance',
          priority: 'medium',
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
          status: 'in_progress',
          scholarId: scholars[1].id,
          assignedBy: viewerUser.id,
        },
        {
          title: 'Upload Proof of Enrollment',
          description:
            'Please provide official documentation confirming your enrollment for the current academic year.',
          type: 'document_upload',
          priority: 'high',
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (overdue)
          status: 'pending',
          scholarId: scholars[2].id,
          assignedBy: adminUser.id,
        },
        {
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
        },
      ])
      .returning();

    // Create goals
    console.log('🎯 Creating goals...');
    const goals = await db
      .insert(schema.goals)
      .values([
        {
          title: 'Achieve First Class Honours',
          description: 'Maintain a GPA above 3.7 throughout my degree program',
          category: 'academic',
          targetDate: new Date('2025-06-30'),
          progress: 75,
          status: 'in_progress',
          scholarId: scholars[0].id,
        },
        {
          title: 'Complete Research Internship',
          description: 'Secure and complete a summer research internship at a leading AI lab',
          category: 'career',
          targetDate: new Date('2024-08-31'),
          progress: 30,
          status: 'in_progress',
          scholarId: scholars[0].id,
        },
        {
          title: 'Launch Campus Mental Health Initiative',
          description:
            'Establish a peer support network for international students struggling with mental health',
          category: 'leadership',
          targetDate: new Date('2024-12-31'),
          progress: 60,
          status: 'in_progress',
          scholarId: scholars[1].id,
        },
        {
          title: 'Publish Research Paper',
          description: 'Co-author and publish a research paper on sustainable water management',
          category: 'academic',
          targetDate: new Date('2024-05-31'),
          progress: 100,
          status: 'completed',
          scholarId: scholars[3].id,
          completedAt: new Date('2024-05-15'),
        },
      ])
      .returning();

    // Create milestones
    console.log('🏁 Creating milestones...');
    await db.insert(schema.milestones).values([
      {
        title: 'Complete all Year 2 core modules',
        goalId: goals[0].id,
        completed: 'true',
        completedDate: new Date('2024-05-20'),
      },
      {
        title: 'Achieve 80%+ in Machine Learning course',
        goalId: goals[0].id,
        completed: 'false',
      },
      {
        title: 'Submit internship applications',
        goalId: goals[1].id,
        completed: 'true',
        completedDate: new Date('2024-01-15'),
      },
      {
        title: 'Complete technical interviews',
        goalId: goals[1].id,
        completed: 'false',
      },
      {
        title: 'Recruit founding team members',
        goalId: goals[2].id,
        completed: 'true',
        completedDate: new Date('2024-02-01'),
      },
      {
        title: 'Launch pilot program with 20 students',
        goalId: goals[2].id,
        completed: 'false',
      },
    ]);

    // Create announcements
    console.log('📢 Creating announcements...');
    const announcements = await db
      .insert(schema.announcements)
      .values([
        {
          title: 'Summer Internship Opportunities Available',
          content:
            'We are excited to share new internship opportunities with our partner organizations. These positions are available in London, Tokyo, and New York. Please check your email for application details and deadlines.',
          createdBy: adminUser.id,
        },
        {
          title: 'Annual Scholars Conference 2024',
          content:
            'Save the date! The Annual Ashinaga Scholars Conference will be held from July 15-17, 2024 in London. This year\'s theme is "Leadership in Action: Creating Sustainable Change". Registration opens next month.',
          createdBy: adminUser.id,
        },
        {
          title: 'New Mental Health Support Services',
          content:
            'We are pleased to announce expanded mental health support services for all scholars. You can now access 24/7 counseling support through our new partnership with BetterHelp. Login details have been sent to your email.',
          createdBy: viewerUser.id,
        },
      ])
      .returning();

    // Create announcement filters
    console.log('🔍 Creating announcement filters...');
    await db.insert(schema.announcementFilters).values([
      {
        announcementId: announcements[0].id,
        filterType: 'year',
        filterValue: 'Year 2',
      },
      {
        announcementId: announcements[0].id,
        filterType: 'year',
        filterValue: 'Year 3',
      },
      {
        announcementId: announcements[0].id,
        filterType: 'year',
        filterValue: 'Year 4',
      },
      {
        announcementId: announcements[2].id,
        filterType: 'status',
        filterValue: 'active',
      },
    ]);

    // Create announcement recipients based on filters
    console.log('📮 Creating announcement recipients...');
    // First announcement targets Year 2, 3, 4 scholars
    await db.insert(schema.announcementRecipients).values([
      { announcementId: announcements[0].id, scholarId: scholars[0].id }, // Amara - Year 2
      { announcementId: announcements[0].id, scholarId: scholars[1].id }, // Kenji - Year 3
      { announcementId: announcements[0].id, scholarId: scholars[3].id }, // Carlos - Year 4
    ]);

    // Second announcement targets all scholars
    for (const scholar of scholars) {
      await db.insert(schema.announcementRecipients).values({
        announcementId: announcements[1].id,
        scholarId: scholar.id,
      });
    }

    // Third announcement targets active scholars only
    const activeScholars = scholars.filter((_s, idx) => [0, 1, 2, 3].includes(idx)); // First 4 are active
    for (const scholar of activeScholars) {
      await db.insert(schema.announcementRecipients).values({
        announcementId: announcements[2].id,
        scholarId: scholar.id,
      });
    }

    // Create requests
    console.log('📝 Creating requests...');
    const requests = await db
      .insert(schema.requests)
      .values([
        {
          scholarId: scholars[0].id,
          type: 'financial_support',
          description:
            'I need financial assistance for purchasing a new laptop. My current laptop has stopped working and I need it for my AI coursework and research projects.',
          priority: 'high',
          status: 'pending',
        },
        {
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
        },
        {
          scholarId: scholars[2].id,
          type: 'academic_support',
          description:
            'I am struggling with advanced statistics in my International Relations program. I would like to request a tutor or additional support resources.',
          priority: 'medium',
          status: 'reviewed',
          reviewedBy: viewerUser.id,
          reviewComment:
            'We have arranged for you to join the statistics support group that meets weekly. Details sent to your email.',
          reviewDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ])
      .returning();

    // Create request attachments
    console.log('📎 Creating request attachments...');
    await db.insert(schema.requestAttachments).values([
      {
        requestId: requests[0].id,
        name: 'laptop_invoice_estimate.pdf',
        size: '245 KB',
        url: 'https://example-bucket.s3.amazonaws.com/requests/laptop_invoice_estimate.pdf',
        mimeType: 'application/pdf',
      },
      {
        requestId: requests[1].id,
        name: 'medical_certificate.pdf',
        size: '156 KB',
        url: 'https://example-bucket.s3.amazonaws.com/requests/medical_certificate.pdf',
        mimeType: 'application/pdf',
      },
    ]);

    // Create request audit logs
    console.log('📜 Creating request audit logs...');
    await db.insert(schema.requestAuditLogs).values([
      {
        requestId: requests[0].id,
        action: 'created',
        performedBy: adminUser.id,
        comment: 'Financial support request submitted',
      },
      {
        requestId: requests[1].id,
        action: 'created',
        performedBy: adminUser.id,
        comment: 'Extenuating circumstances request submitted',
      },
      {
        requestId: requests[1].id,
        action: 'status_changed',
        performedBy: adminUser.id,
        previousStatus: 'pending',
        newStatus: 'approved',
        comment: 'Request approved with deadline extensions granted',
      },
      {
        requestId: requests[2].id,
        action: 'created',
        performedBy: viewerUser.id,
        comment: 'Academic support request submitted',
      },
      {
        requestId: requests[2].id,
        action: 'status_changed',
        performedBy: viewerUser.id,
        previousStatus: 'pending',
        newStatus: 'reviewed',
        comment: 'Arranged statistics support group enrollment',
      },
    ]);

    // Create documents
    console.log('📄 Creating documents...');
    await db.insert(schema.documents).values([
      {
        scholarId: scholars[0].id,
        name: 'Fall_2023_Transcript.pdf',
        type: 'transcript',
        mimeType: 'application/pdf',
        size: '512 KB',
        url: 'https://example-bucket.s3.amazonaws.com/documents/fall_2023_transcript.pdf',
        uploadedBy: adminUser.id,
      },
      {
        scholarId: scholars[0].id,
        name: 'Enrollment_Certificate_2024.pdf',
        type: 'certificate',
        mimeType: 'application/pdf',
        size: '128 KB',
        url: 'https://example-bucket.s3.amazonaws.com/documents/enrollment_cert_2024.pdf',
        uploadedBy: adminUser.id,
      },
      {
        scholarId: scholars[1].id,
        name: 'Medical_School_Progress_Report.pdf',
        type: 'report',
        mimeType: 'application/pdf',
        size: '256 KB',
        url: 'https://example-bucket.s3.amazonaws.com/documents/medical_progress_report.pdf',
        uploadedBy: viewerUser.id,
      },
      {
        scholarId: scholars[3].id,
        name: 'Research_Publication_Draft.pdf',
        type: 'report',
        mimeType: 'application/pdf',
        size: '1.2 MB',
        url: 'https://example-bucket.s3.amazonaws.com/documents/research_publication.pdf',
        uploadedBy: adminUser.id,
      },
    ]);

    console.log('✅ Development data populated successfully!');
    console.log(`Created:
    - ${2} staff members (1 admin, 1 viewer)
    - ${scholars.length} scholars
    - ${tasks.length} tasks
    - ${goals.length} goals with milestones
    - ${announcements.length} announcements
    - ${requests.length} requests with attachments and audit logs
    - ${4} documents`);

    console.log('\n📧 Login credentials:');
    console.log('Note: Better Auth will handle authentication. Use these emails for testing:');
    console.log('Staff Admin: sarah.johnson@ashinaga.org');
    console.log('Staff Viewer: michael.chen@ashinaga.org');
    console.log('Scholar: amara.okafor@example.com');
    console.log('\nPasswords will be set when users are created through Better Auth signup flow.');
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
