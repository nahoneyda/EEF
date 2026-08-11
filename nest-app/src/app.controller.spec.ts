import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './common/supabase/supabase.service';

describe('AppController', () => {
  let appController: AppController;

  const mockSupabaseService = {
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return ok when Supabase is connected', async () => {
      mockSupabaseService.healthCheck.mockResolvedValue(true);

      const result = await appController.health();

      expect(result).toEqual(
        expect.objectContaining({
          status: 'ok',
          service: 'EEF NestJS',
          runtime: 'nestjs',
          supabase: 'connected',
          timestamp: expect.any(String),
        }),
      );

      expect(mockSupabaseService.healthCheck).toHaveBeenCalledTimes(1);
    });

    it('should return degraded when Supabase is disconnected', async () => {
      mockSupabaseService.healthCheck.mockResolvedValue(false);

      const result = await appController.health();

      expect(result).toEqual(
        expect.objectContaining({
          status: 'degraded',
          service: 'EEF NestJS',
          runtime: 'nestjs',
          supabase: 'disconnected',
          timestamp: expect.any(String),
        }),
      );

      expect(mockSupabaseService.healthCheck).toHaveBeenCalledTimes(1);
    });
  });
});