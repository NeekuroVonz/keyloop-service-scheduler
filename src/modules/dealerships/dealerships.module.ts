import { Module } from '@nestjs/common';
import { DealershipsController } from './dealerships.controller';

@Module({
  controllers: [DealershipsController],
})
export class DealershipsModule {}
