import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AllExceptionsFilter } from '../../src/common/filters/http-exception.filter';

@Controller('api/boom')
class BoomController {
  @Get()
  boom(): never {
    throw new Error('TOP_SECRET_DB_PASSWORD=hunter2 stacktrace');
  }
}

@Module({ controllers: [BoomController] })
class BoomModule {}

describe('Unexpected 500 redaction (e2e)', () => {
  let app: INestApplication;
  let httpServer: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BoomModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns generic 500 without leaking internal error text', async () => {
    const response = await request(httpServer).get('/api/boom').expect(500);
    expect(response.body.message).toBe('Internal server error');
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
    expect(JSON.stringify(response.body)).not.toContain('TOP_SECRET');
  });
});
