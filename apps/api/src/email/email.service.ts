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

  async sendWelcomeEmail(_email: string, _name: string): Promise<void> {
    // Similar implementation for welcome emails
    // This can be extended later
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
