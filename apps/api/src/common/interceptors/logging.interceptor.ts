import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const now = Date.now();

    // Log request
    const { method, url, body, query, params, headers } = request;
    const userAgent = headers['user-agent'] || '-';
    const ip = request.ip || request.connection?.remoteAddress || '-';

    this.logger.log(`[REQUEST] ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`);

    // Log request details in development
    if (process.env.NODE_ENV !== 'production') {
      if (Object.keys(query).length > 0) {
        this.logger.debug(`Query: ${JSON.stringify(query)}`);
      }
      if (Object.keys(params).length > 0) {
        this.logger.debug(`Params: ${JSON.stringify(params)}`);
      }
      if (body && Object.keys(body).length > 0) {
        // Sanitize sensitive data
        const sanitizedBody = this.sanitizeBody(body);
        this.logger.debug(`Body: ${JSON.stringify(sanitizedBody)}`);
      }
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          const statusCode = response.statusCode;

          this.logger.log(
            `[RESPONSE] ${method} ${url} - Status: ${statusCode} - Time: ${responseTime}ms`
          );

          // Log response data in development (be careful with sensitive data)
          if (process.env.NODE_ENV !== 'production' && data) {
            const sanitizedData = this.sanitizeBody(data);
            this.logger.debug(`Response: ${JSON.stringify(sanitizedData).substring(0, 500)}...`);
          }
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `[ERROR] ${method} ${url} - Status: ${error.status || 500} - Time: ${responseTime}ms - Error: ${error.message}`,
            error.stack
          );
        },
      })
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'cookie'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeBody(sanitized[key]);
      }
    }

    return sanitized;
  }
}
