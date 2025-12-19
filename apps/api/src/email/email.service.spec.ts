import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('sendPasswordResetEmail', () => {
    it('should log password reset email when Resend is not configured', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.sendPasswordResetEmail({
        email: 'test@example.com',
        resetUrl: 'https://example.com/reset',
        userType: 'scholar',
      });

      expect(consoleSpy).toHaveBeenCalledWith('PASSWORD RESET EMAIL (Resend not configured)');
      expect(consoleSpy).toHaveBeenCalledWith('To: test@example.com');
      expect(consoleSpy).toHaveBeenCalledWith('Reset Link: https://example.com/reset');

      consoleSpy.mockRestore();
    });

    it('should send email via Resend when configured', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.EMAIL_FROM = 'test@ashinaga.org';

      const mockSend = jest.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null });

      const module: TestingModule = await Test.createTestingModule({
        providers: [EmailService],
      }).compile();

      const serviceWithResend = module.get<EmailService>(EmailService);
      const serviceInstance = serviceWithResend as EmailService & {
        resend: { emails: { send: typeof mockSend } };
      };
      serviceInstance.resend = { emails: { send: mockSend } };

      await serviceWithResend.sendPasswordResetEmail({
        email: 'scholar@example.com',
        resetUrl: 'https://example.com/reset',
        userType: 'scholar',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'test@ashinaga.org',
          to: 'scholar@example.com',
          subject: 'Reset your Ashinaga Scholar Portal password',
          html: expect.stringContaining('Reset Your Password'),
        })
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should complete successfully', async () => {
      await expect(
        service.sendWelcomeEmail('test@example.com', 'Test User')
      ).resolves.toBeUndefined();
    });
  });
});
