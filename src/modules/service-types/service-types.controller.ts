import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('service-types')
@Controller('api/service-types')
export class ServiceTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List service types' })
  @ApiOkResponse({ description: 'Service type list' })
  async list(): Promise<
    Array<{ id: string; name: string; durationMinutes: number }>
  > {
    return this.prisma.serviceType.findMany({
      select: { id: true, name: true, durationMinutes: true },
      orderBy: { name: 'asc' },
    });
  }
}
