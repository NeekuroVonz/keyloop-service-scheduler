import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('dealerships')
@Controller('api/dealerships')
export class DealershipsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List dealerships' })
  @ApiOkResponse({ description: 'Dealership list' })
  async list(): Promise<Array<{ id: string; name: string; timezone: string }>> {
    return this.prisma.dealership.findMany({
      select: { id: true, name: true, timezone: true },
      orderBy: { name: 'asc' },
    });
  }
}
