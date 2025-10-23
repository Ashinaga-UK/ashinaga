import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    // Only initialize if API key is provided
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@ashinaga.org';
    const appName = email.includes('@ashinaga.org')
      ? 'Ashinaga Staff Portal'
      : 'Ashinaga Scholar Portal';

    // If Resend is not configured, fallback to console logging
    if (!this.resend) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('PASSWORD RESET EMAIL (Resend not configured)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`To: ${email}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Reset Link: ${resetUrl}`);
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('To enable email sending:');
      console.log('1. Sign up at https://resend.com (free)');
      console.log('2. Get your API key');
      console.log('3. Add RESEND_API_KEY to your .env file');
      console.log('4. Add EMAIL_FROM with your verified domain email');
      console.log('═══════════════════════════════════════════════════════════════');

      // In development, save to file for testing
      if (process.env.NODE_ENV === 'development') {
        const fs = await import('node:fs/promises');
        const resetData = {
          email,
          resetUrl,
          timestamp: new Date().toISOString(),
        };

        try {
          await fs.writeFile('/tmp/last-password-reset.json', JSON.stringify(resetData, null, 2));
          console.log('Reset link saved to: /tmp/last-password-reset.json');
        } catch (error) {
          console.error('Failed to save reset link:', error);
        }
      }
      return;
    }

    // Send actual email via Resend
    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Reset your ${appName} password`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Ashinaga</h1>
              </div>
              
              <div style="background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
                
                <p>Hi there,</p>
                
                <p>We received a request to reset your password for your ${appName} account. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600;">Reset Password</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #0D9488;">${resetUrl}</p>
                
                <p>This link will expire in 1 hour for security reasons.</p>
                
                <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
                
                <p style="color: #666; font-size: 14px;">
                  Best regards,<br>
                  The Ashinaga Team
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Ashinaga. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('Failed to send password reset email:', error);
        throw new Error('Failed to send password reset email');
      }

      console.log('Password reset email sent successfully:', data);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@ashinaga.org';

    // If Resend is not configured, fallback to console logging
    if (!this.resend) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('EMAIL (Resend not configured)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`To: ${options.to}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Subject: ${options.subject}`);
      console.log('Body (text):');
      console.log(options.text || 'No text version provided');
      console.log('═══════════════════════════════════════════════════════════════');
      return;
    }

    // Send actual email via Resend
    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (error) {
        console.error('Failed to send email:', error);
        throw new Error('Failed to send email');
      }

      console.log('Email sent successfully:', data);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(_email: string, _name: string): Promise<void> {
    // Similar implementation for welcome emails
    // This can be extended later
  }

  async sendAnnouncementEmail(
    email: string,
    scholarName: string,
    announcementTitle: string,
    announcementContent: string,
    _announcementId: string
  ): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@ashinaga.org';
    const scholarAppUrl = process.env.SCHOLAR_APP_URL || 'http://localhost:4002';
    const announcementUrl = `${scholarAppUrl}/announcements`;

    // If Resend is not configured, fallback to console logging
    if (!this.resend) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('ANNOUNCEMENT EMAIL (Resend not configured)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`To: ${email}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Scholar: ${scholarName}`);
      console.log(`Title: ${announcementTitle}`);
      console.log(`Content: ${announcementContent}`);
      console.log(`View URL: ${announcementUrl}`);
      console.log('═══════════════════════════════════════════════════════════════');
      return;
    }

    // Send actual email via Resend
    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `New Announcement: ${announcementTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Announcement</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Ashinaga</h1>
              </div>

              <div style="background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">New Announcement</h2>

                <p>Dear ${scholarName},</p>

                <p>A new announcement has been posted for you:</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0D9488;">
                  <h3 style="margin-top: 0; color: #0D9488;">${announcementTitle}</h3>
                  <p style="white-space: pre-wrap; margin-bottom: 0;">${announcementContent}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${announcementUrl}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600;">View in App</a>
                </div>

                <p style="color: #666; font-size: 14px;">You can view all announcements in your scholar portal at any time.</p>

                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

                <p style="color: #666; font-size: 14px;">
                  Best regards,<br>
                  The Ashinaga Team
                </p>
              </div>

              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Ashinaga. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
        text: `
Dear ${scholarName},

A new announcement has been posted for you:

Title: ${announcementTitle}

${announcementContent}

View this announcement in your scholar portal:
${announcementUrl}

Best regards,
The Ashinaga Team
        `.trim(),
      });

      if (error) {
        console.error('Failed to send announcement email:', error);
        throw new Error('Failed to send announcement email');
      }

      console.log('Announcement email sent successfully:', data);
    } catch (error) {
      console.error('Error sending announcement email:', error);
      throw error;
    }
  }

  async sendGoalCommentEmail(
    email: string,
    recipientName: string,
    commenterName: string,
    commenterType: 'staff' | 'scholar',
    goalTitle: string,
    commentText: string,
    _goalId: string
  ): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@ashinaga.org';
    const appUrl =
      commenterType === 'staff'
        ? process.env.SCHOLAR_APP_URL || 'http://localhost:4002'
        : process.env.STAFF_APP_URL || 'http://localhost:4001';
    const goalUrl = `${appUrl}/dashboard`; // Both portals have dashboard with goals

    // If Resend is not configured, fallback to console logging
    if (!this.resend) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('GOAL COMMENT EMAIL (Resend not configured)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`To: ${email}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Recipient: ${recipientName}`);
      console.log(`Commenter: ${commenterName} (${commenterType})`);
      console.log(`Goal: ${goalTitle}`);
      console.log(`Comment: ${commentText}`);
      console.log(`View URL: ${goalUrl}`);
      console.log('═══════════════════════════════════════════════════════════════');
      return;
    }

    // Send actual email via Resend
    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `New comment on your goal: ${goalTitle}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>New Goal Comment</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Ashinaga</h1>
              </div>

              <div style="background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">New Comment on Your LDF Goal</h2>

                <p>Dear ${recipientName},</p>

                <p>${commenterName} has commented on your goal:</p>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0D9488;">
                  <h3 style="margin-top: 0; color: #0D9488;">${goalTitle}</h3>
                </div>

                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; font-weight: 600; color: #666; font-size: 14px;">Comment from ${commenterName}:</p>
                  <p style="white-space: pre-wrap; margin: 10px 0 0 0; font-style: italic;">"${commentText}"</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${goalUrl}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600;">View Goal & Reply</a>
                </div>

                <p style="color: #666; font-size: 14px;">You can view and respond to this comment in your dashboard.</p>

                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

                <p style="color: #666; font-size: 14px;">
                  Best regards,<br>
                  The Ashinaga Team
                </p>
              </div>

              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Ashinaga. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
        text: `
Dear ${recipientName},

${commenterName} has commented on your goal: ${goalTitle}

Comment from ${commenterName}:
"${commentText}"

View and respond to this comment in your dashboard:
${goalUrl}

Best regards,
The Ashinaga Team
        `.trim(),
      });

      if (error) {
        console.error('Failed to send goal comment email:', error);
        throw new Error('Failed to send goal comment email');
      }

      console.log('Goal comment email sent successfully:', data);
    } catch (error) {
      console.error('Error sending goal comment email:', error);
      throw error;
    }
  }

  async sendRequestStatusNotification(
    email: string,
    scholarName: string,
    requestType: string,
    status: 'approved' | 'rejected' | 'commented',
    comment: string,
    requestDescription: string
  ): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM || 'noreply@ashinaga.org';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    const statusColor =
      status === 'approved' ? '#16A34A' : status === 'rejected' ? '#DC2626' : '#F59E0B';

    // If Resend is not configured, fallback to console logging
    if (!this.resend) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('REQUEST STATUS NOTIFICATION EMAIL (Resend not configured)');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`To: ${email}`);
      console.log(`From: ${fromEmail}`);
      console.log(`Scholar: ${scholarName}`);
      console.log(`Request Type: ${requestType}`);
      console.log(`Status: ${statusText}`);
      console.log(`Comment: ${comment}`);
      console.log('═══════════════════════════════════════════════════════════════');
      return;
    }

    // Send actual email via Resend
    try {
      const { data, error } = await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `Your ${requestType} request has been ${status}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Request Status Update</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Ashinaga</h1>
              </div>
              
              <div style="background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Request Status Update</h2>
                
                <p>Dear ${scholarName},</p>
                
                <p>Your request has been reviewed and ${status}.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Request Details</h3>
                  <p><strong>Type:</strong> ${requestType}</p>
                  <p><strong>Description:</strong> ${requestDescription}</p>
                  <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span></p>
                </div>
                
                ${
                  comment
                    ? `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0D9488;">
                  <h3 style="margin-top: 0; color: #333;">Review Comment</h3>
                  <p style="margin-bottom: 0; font-style: italic;">"${comment}"</p>
                </div>
                `
                    : ''
                }
                
                <p>If you have any questions about this decision, please don't hesitate to reach out to your program coordinator.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
                
                <p style="color: #666; font-size: 14px;">
                  Best regards,<br>
                  The Ashinaga Team
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Ashinaga. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error('Failed to send request status notification email:', error);
        throw new Error('Failed to send request status notification email');
      }

      console.log('Request status notification email sent successfully:', data);
    } catch (error) {
      console.error('Error sending request status notification email:', error);
      throw error;
    }
  }
}
