import { Module } from '@nestjs/common';
import { ServiceTypesController } from './service-types.controller';

@Module({
  controllers: [ServiceTypesController],
})
export class ServiceTypesModule {}
