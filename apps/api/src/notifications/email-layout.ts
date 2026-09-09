export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function brandedEmail(options: {
  title: string;
  greeting: string;
  bodyHtml: string;
  textBody: string;
  ctaUrl: string;
  ctaLabel: string;
}): { html: string; text: string } {
  const year = new Date().getUTCFullYear();
  return {
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${escapeHtml(options.title)}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Ashinaga</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">${escapeHtml(options.title)}</h2>
            <p>${escapeHtml(options.greeting)}</p>
            ${options.bodyHtml}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${escapeHtml(options.ctaUrl)}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600;">${escapeHtml(options.ctaLabel)}</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">Best regards,<br>The Ashinaga Team</p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>© ${year} Ashinaga. All rights reserved.</p>
          </div>
        </body>
      </html>
    `.trim(),
    text: `${options.title}\n\n${options.greeting}\n\n${options.textBody}\n\n${options.ctaLabel}: ${options.ctaUrl}\n`.trim(),
  };
}
