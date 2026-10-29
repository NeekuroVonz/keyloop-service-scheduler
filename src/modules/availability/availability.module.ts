import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AvailabilityController } from './availability.controller';

@Module({
  imports: [AppointmentsModule],
  controllers: [AvailabilityController],
})
export class AvailabilityModule {}
