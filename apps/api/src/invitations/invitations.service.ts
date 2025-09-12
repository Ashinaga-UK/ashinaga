import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq } from 'drizzle-orm';
import { generateInvitationToken } from '../auth/auth.config';
import { getDatabase } from '../db/connection';
import { invitations, users } from '../db/schema';
import { EmailService } from '../email/email.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  private readonly emailService: EmailService;

  constructor(private readonly configService: ConfigService) {
    this.emailService = new EmailService();
  }

  async createInvitation(dto: CreateInvitationDto, invitedBy: string) {
    const db = getDatabase();

    // Always use lowercase email for consistency
    const emailLower = dto.email.toLowerCase();

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);

    if (existingUser[0]) {
      throw new ConflictException('A user with this email already exists');
    }

    // Check for existing pending invitation
    const existingInvitation = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.email, emailLower), eq(invitations.status, 'pending')))
      .limit(1);

    if (existingInvitation[0]) {
      // Check if invitation is still valid
      if (new Date() < new Date(existingInvitation[0].expiresAt)) {
        throw new ConflictException('An active invitation already exists for this email');
      }
      // Mark old invitation as expired
      await db
        .update(invitations)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(invitations.id, existingInvitation[0].id));
    }

    // Generate invitation token
    const token = generateInvitationToken();

    // Create expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const [invitation] = await db
      .insert(invitations)
      .values({
        email: emailLower,
        userType: dto.userType,
        invitedBy,
        token,
        expiresAt,
        scholarData: dto.scholarData ? JSON.stringify(dto.scholarData) : null,
        status: 'pending',
        resentCount: '0',
      })
      .returning();

    // Send invitation email
    const inviteUrl = this.buildInviteUrl(token, dto.userType);
    await this.sendInvitationEmail(emailLower, inviteUrl, dto.userType);

    // Update sentAt timestamp
    await db
      .update(invitations)
      .set({ sentAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    return {
      id: invitation.id,
      email: invitation.email,
      userType: invitation.userType,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      sentAt: new Date(),
    };
  }

  async resendInvitation(invitationId: string, requestingUserId: string) {
    const db = getDatabase();

    // Get the invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Cannot resend invitation with status: ${invitation.status}`);
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      throw new BadRequestException('Invitation has expired. Please create a new invitation.');
    }

    // Check resend count limit (max 5 resends)
    const resentCount = parseInt(invitation.resentCount) || 0;
    if (resentCount >= 5) {
      throw new BadRequestException('Maximum resend limit reached for this invitation');
    }

    // Send invitation email
    const inviteUrl = this.buildInviteUrl(invitation.token, invitation.userType);
    await this.sendInvitationEmail(invitation.email, inviteUrl, invitation.userType);

    // Update resend information
    await db
      .update(invitations)
      .set({
        lastResentAt: new Date(),
        resentCount: String(resentCount + 1),
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId));

    return {
      message: 'Invitation resent successfully',
      resentCount: resentCount + 1,
    };
  }

  async listInvitations(status?: 'pending' | 'accepted' | 'expired' | 'cancelled') {
    const db = getDatabase();

    const baseQuery = db
      .select({
        id: invitations.id,
        email: invitations.email,
        userType: invitations.userType,
        status: invitations.status,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
        sentAt: invitations.sentAt,
        lastResentAt: invitations.lastResentAt,
        resentCount: invitations.resentCount,
        invitedBy: invitations.invitedBy,
        createdAt: invitations.createdAt,
      })
      .from(invitations);

    const query = status ? baseQuery.where(eq(invitations.status, status)) : baseQuery;

    const results = await query.orderBy(desc(invitations.createdAt));
    return results;
  }

  async cancelInvitation(invitationId: string, cancelledBy: string) {
    const db = getDatabase();

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel invitation with status: ${invitation.status}`);
    }

    await db
      .update(invitations)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(invitations.id, invitationId));

    return {
      message: 'Invitation cancelled successfully',
    };
  }

  private buildInviteUrl(token: string, userType: string): string {
    // Determine the correct frontend URL based on user type
    const envVar = userType === 'staff' ? 'STAFF_APP_URL' : 'SCHOLAR_APP_URL';
    const defaultUrl = userType === 'staff' ? 'http://localhost:4001' : 'http://localhost:4002';
    const baseUrl = this.configService.get<string>(envVar, defaultUrl);

    console.log(`[InvitationService] Building invite URL for ${userType}:`);
    console.log(`  - Environment variable: ${envVar}`);
    console.log(`  - Value from env: ${this.configService.get<string>(envVar) || 'NOT SET'}`);
    console.log(`  - Using URL: ${baseUrl}`);
    console.log(`  - Full invite URL: ${baseUrl}/signup?token=${token}`);

    return `${baseUrl}/signup?token=${token}`;
  }

  private async sendInvitationEmail(email: string, inviteUrl: string, userType: string) {
    const subject = `You're invited to join Ashinaga as ${userType === 'staff' ? 'a staff member' : 'a scholar'}`;

    const htmlContent = `
      <h2>Welcome to Ashinaga!</h2>
      <p>You have been invited to join the Ashinaga platform as ${userType === 'staff' ? 'a staff member' : 'a scholar'}.</p>
      <p>Click the link below to complete your registration:</p>
      <p><a href="${inviteUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Complete Registration</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p>${inviteUrl}</p>
      <p>This invitation will expire in 7 days.</p>
      <p>If you did not expect this invitation, please ignore this email.</p>
    `;

    const textContent = `
      Welcome to Ashinaga!
      
      You have been invited to join the Ashinaga platform as ${userType === 'staff' ? 'a staff member' : 'a scholar'}.
      
      Complete your registration at:
      ${inviteUrl}
      
      This invitation will expire in 7 days.
      
      If you did not expect this invitation, please ignore this email.
    `;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject,
        html: htmlContent,
        text: textContent,
      });
    } catch (error) {
      console.error('Failed to send invitation email:', error);
      // Don't throw - invitation is created, email sending failure shouldn't break the flow
    }
  }
}
