import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireTenantCompanyId } from '../../common/decorators/tenant.decorator';
import { AdminService } from './admin.service';
import { AssignmentService } from '../assignments/assignment.service';

@Controller('api/v1/admin')
@Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private assignmentService: AssignmentService,
  ) {}

  @Get('dashboard')
  async dashboard(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.adminService.getDashboard(companyId);
    return { success: true, message: 'Dashboard data retrieved', data };
  }

  @Get('branding')
  async getBranding(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.adminService.getBranding(companyId);
    return { success: true, message: 'Branding retrieved', data };
  }

  @Patch('branding')
  async updateBranding(
    @RequireTenantCompanyId() companyId: string,
    @Body()
    dto: {
      showPartnerLogo?: boolean;
      partnerLogoUrl?: string | null;
      logoUrl?: string | null;
      primaryColor?: string | null;
    },
  ): Promise<ApiResponse> {
    const data = await this.adminService.updateBranding(companyId, dto);
    return { success: true, message: 'Branding updated', data };
  }

  @Get('users')
  async users(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.adminService.listUsers(companyId);
    return { success: true, message: 'Users retrieved', data };
  }

  @Post('users')
  async createUser(
    @RequireTenantCompanyId() companyId: string,
    @Body()
    dto: {
      email: string;
      fullName: string;
      role?: UserRole;
      departmentId?: string;
      hrisEmployeeId?: string;
      location?: string;
    },
  ): Promise<ApiResponse> {
    const data = await this.adminService.createUser(companyId, dto);
    return { success: true, message: 'User created', data };
  }

  @Get('departments')
  async departments(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.adminService.listDepartments(companyId);
    return { success: true, message: 'Departments retrieved', data };
  }

  @Get('groups')
  async groups(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.adminService.listGroups(companyId);
    return { success: true, message: 'Groups retrieved', data };
  }

  @Get('training-stats')
  async trainingStats(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.assignmentService.getStats(companyId);
    return { success: true, message: 'Training statistics retrieved', data };
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.adminService.deleteUser(id, companyId);
    return { success: true, message: 'User deactivated', data };
  }

  @Delete('enrollments/:id')
  async deleteEnrollment(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.adminService.deleteEnrollment(id, companyId);
    return { success: true, message: 'Enrollment deleted', data };
  }
}
