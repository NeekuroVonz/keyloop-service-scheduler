import { randomUUID } from 'crypto';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { requestIdMiddleware } from './common/logging/request-id.middleware';
import { PrismaModule } from './database/prisma.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { DealershipsModule } from './modules/dealerships/dealerships.module';
import { HealthModule } from './modules/health/health.module';
import { ServiceTypesModule } from './modules/service-types/service-types.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        genReqId: (req, res) => {
          const existing = req.headers['x-request-id'];
          if (typeof existing === 'string' && existing.length > 0) {
            return existing;
          }
          const generated = randomUUID();
          res.setHeader('x-request-id', generated);
          return generated;
        },
        customProps: (req) => ({
          requestId: req.headers['x-request-id'],
        }),
        serializers: {
          req: (req: { method?: string; url?: string }) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode?: number }) => ({
            statusCode: res.statusCode,
          }),
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.email',
            'req.body.name',
            'req.body.vin',
          ],
          remove: true,
        },
      },
    }),
    PrismaModule,
    HealthModule,
    DealershipsModule,
    ServiceTypesModule,
    AvailabilityModule,
    AppointmentsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware).forRoutes('*');
  }
}
