import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';

// Mock the auth config
jest.mock('./auth.config', () => ({
  auth: {
    handler: jest.fn().mockResolvedValue({
      status: 200,
      headers: new Map(),
      text: jest.fn().mockResolvedValue('{"success":true}'),
    }),
  },
}));

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should handle auth requests', async () => {
    const mockReq = {
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'test@example.com', password: 'password' },
      headers: {
        'content-type': 'application/json',
      },
      protocol: 'http',
      hostname: 'localhost',
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      header: jest.fn(),
      redirect: jest.fn(),
    };

    await controller.handleAuth(mockReq as never, mockRes as never);

    const { auth } = require('./auth.config');
    expect(auth.handler).toHaveBeenCalled();
    expect(mockRes.send).toHaveBeenCalledWith('{"success":true}');
  });
});
