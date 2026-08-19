import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AssignmentService, CreateAssignmentDto } from './assignment.service';

@Controller('api/v1/admin/assignments')
@Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
export class AssignmentController {
  constructor(private service: AssignmentService) {}

  @Get()
  async list(): Promise<ApiResponse> {
    const data = await this.service.list();
    return { success: true, message: 'Assignments retrieved', data };
  }

  @Post()
  async create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse> {
    const data = await this.service.create(dto, user);
    return { success: true, message: 'Assignment created and enrollments generated', data };
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.service.getById(id);
    return { success: true, message: 'Assignment retrieved', data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<ApiResponse> {
    const data = await this.service.delete(id);
    return { success: true, message: 'Assignment deleted', data };
  }
}
