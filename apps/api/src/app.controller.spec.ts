import { beforeEach, describe, expect, it } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return HTML home page', () => {
      const result = appController.getHome();
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<title>Ashinaga API</title>');
      expect(result).toContain('🚀 Ashinaga API');
      expect(result).toContain('View Swagger Documentation →');
      expect(result).toContain('/api');
    });

    it('should contain all expected sections', () => {
      const result = appController.getHome();
      expect(result).toContain('API Documentation');
      expect(result).toContain('Tech Stack');
      expect(result).toContain('Development');
    });
  });
});
