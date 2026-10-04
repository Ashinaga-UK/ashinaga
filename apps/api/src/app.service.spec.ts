import { beforeEach, describe, expect, it } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHomePage', () => {
    it('should return HTML content', () => {
      const result = service.getHomePage();
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('</html>');
    });

    it('should contain proper HTML structure', () => {
      const result = service.getHomePage();
      expect(result).toContain('<html lang="en">');
      expect(result).toContain('<head>');
      expect(result).toContain('<body>');
      expect(result).toContain('<title>Ashinaga API</title>');
    });

    it('should contain main title and branding', () => {
      const result = service.getHomePage();
      expect(result).toContain('🚀 Ashinaga API');
      expect(result).toContain('Welcome');
    });

    it('should contain status indicator', () => {
      const result = service.getHomePage();
      expect(result).toContain('API is running and ready to serve requests');
    });

    it('should contain documentation section', () => {
      const result = service.getHomePage();
      expect(result).toContain('📚 API Documentation');
      expect(result).toContain('View Swagger Documentation →');
      expect(result).toContain('href="/api"');
    });

    it('should omit the Swagger link outside development/test', () => {
      const previous = process.env.NODE_ENV;
      try {
        for (const nodeEnv of ['production', 'prod', undefined] as const) {
          if (nodeEnv === undefined) {
            delete process.env.NODE_ENV;
          } else {
            process.env.NODE_ENV = nodeEnv;
          }
          const result = service.getHomePage();
          expect(result).not.toContain('View Swagger Documentation');
          expect(result).not.toContain('href="/api"');
        }
      } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
      }
    });

    it('should contain tech stack section', () => {
      const result = service.getHomePage();
      expect(result).toContain('⚡ Tech Stack');
      expect(result).toContain('NestJS with Fastify adapter');
      expect(result).toContain('Node.js');
      expect(result).toContain('TypeScript');
      expect(result).toContain('Swagger/OpenAPI');
    });

    it('should contain development section', () => {
      const result = service.getHomePage();
      expect(result).toContain('🛠️ Development');
      expect(result).toContain('Ashinaga monorepo');
    });
  });
});
