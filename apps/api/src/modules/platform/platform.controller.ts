import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { PlatformService } from './platform.service';

@Controller('api/v1/platform')
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformController {
  constructor(private platform: PlatformService) {}

  @Get('dashboard')
  async dashboard(): Promise<ApiResponse> {
    const data = await this.platform.getDashboard();
    return { success: true, message: 'Platform dashboard retrieved', data };
  }

  @Get('companies')
  async listCompanies(): Promise<ApiResponse> {
    const data = await this.platform.listCompanies();
    return { success: true, message: 'Companies retrieved', data };
  }

  @Post('companies')
  async createCompany(
    @Body()
    dto: {
      name: string;
      slug: string;
      maxUsers?: number;
      maxCourses?: number;
      adminEmail?: string;
      adminName?: string;
    },
  ): Promise<ApiResponse> {
    const data = await this.platform.createCompany(dto);
    return { success: true, message: 'Company created', data };
  }

  @Get('companies/:id')
  async getCompany(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.platform.getCompany(id);
    return { success: true, message: 'Company retrieved', data };
  }

  @Patch('companies/:id/suspend')
  async suspend(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.platform.suspendCompany(id);
    return { success: true, message: 'Company suspended', data };
  }

  @Patch('companies/:id/activate')
  async activate(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.platform.activateCompany(id);
    return { success: true, message: 'Company activated', data };
  }
}
