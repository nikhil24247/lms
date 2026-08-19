import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DirectoryProvider, UserRole } from '@prisma/client';
import { Response } from 'express';
import { ApiResponse } from '@lms/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireTenantCompanyId } from '../../common/decorators/tenant.decorator';
import {
  CreateUserDto,
  DynamicGroupRules,
  UpdateUserDto,
  UsersService,
} from './users.service';

@Controller('api/v1/admin')
@Roles(UserRole.LMS_ADMIN, UserRole.SYSTEM_ADMIN)
export class UsersController {
  constructor(private users: UsersService) {}

  // --- Users ---

  @Get('people')
  async listPeople(
    @RequireTenantCompanyId() companyId: string,
    @Query('archived') archived?: string,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<ApiResponse> {
    const data = await this.users.listUsers(companyId, {
      archived: archived === '1' || archived === 'true',
      search,
      departmentId,
      branchId,
    });
    return { success: true, message: 'Users retrieved', data };
  }

  @Post('people')
  async createPerson(
    @RequireTenantCompanyId() companyId: string,
    @Body() dto: CreateUserDto,
  ): Promise<ApiResponse> {
    const data = await this.users.createUser(companyId, dto);
    return { success: true, message: 'User created', data };
  }

  @Get('people/import-template')
  async importTemplate(@Res() res: Response) {
    const buffer = await this.users.getImportTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="user-import-template.xlsx"');
    res.send(buffer);
  }

  @Post('people/import')
  @UseInterceptors(FileInterceptor('file'))
  async importPeople(
    @RequireTenantCompanyId() companyId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse> {
    if (!file?.buffer) throw new BadRequestException('Excel/CSV file is required');
    const data = await this.users.importUsers(companyId, file.buffer);
    return { success: true, message: 'Import completed', data };
  }

  @Patch('people/:id')
  async updatePerson(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ApiResponse> {
    const data = await this.users.updateUser(id, companyId, dto);
    return { success: true, message: 'User updated', data };
  }

  @Post('people/:id/archive')
  async archivePerson(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.users.archiveUser(id, companyId);
    return { success: true, message: 'User archived', data };
  }

  @Post('people/:id/restore')
  async restorePerson(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.users.restoreUser(id, companyId);
    return { success: true, message: 'User restored', data };
  }

  // --- Departments & branches ---

  @Get('org/departments')
  async departments(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.users.listDepartments(companyId);
    return { success: true, message: 'Departments retrieved', data };
  }

  @Post('org/departments')
  async createDepartment(
    @RequireTenantCompanyId() companyId: string,
    @Body() dto: { name: string; code: string },
  ): Promise<ApiResponse> {
    const data = await this.users.createDepartment(companyId, dto);
    return { success: true, message: 'Department created', data };
  }

  @Get('org/branches')
  async branches(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.users.listBranches(companyId);
    return { success: true, message: 'Branches retrieved', data };
  }

  @Post('org/branches')
  async createBranch(
    @RequireTenantCompanyId() companyId: string,
    @Body() dto: { name: string; code: string; city?: string },
  ): Promise<ApiResponse> {
    const data = await this.users.createBranch(companyId, dto);
    return { success: true, message: 'Branch created', data };
  }

  // --- Groups ---

  @Get('user-groups')
  async groups(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.users.listGroups(companyId);
    return { success: true, message: 'Groups retrieved', data };
  }

  @Post('user-groups')
  async createGroup(
    @RequireTenantCompanyId() companyId: string,
    @Body()
    dto: {
      name: string;
      description?: string;
      isDynamic?: boolean;
      rulesJson?: DynamicGroupRules;
      memberIds?: string[];
    },
  ): Promise<ApiResponse> {
    const data = await this.users.createGroup(companyId, dto);
    return { success: true, message: 'Group created', data };
  }

  @Get('user-groups/:id')
  async getGroup(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.users.getGroup(id, companyId);
    return { success: true, message: 'Group retrieved', data };
  }

  @Patch('user-groups/:id')
  async updateGroup(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
    @Body()
    dto: {
      name?: string;
      description?: string;
      isDynamic?: boolean;
      rulesJson?: DynamicGroupRules;
      memberIds?: string[];
    },
  ): Promise<ApiResponse> {
    const data = await this.users.updateGroup(id, companyId, dto);
    return { success: true, message: 'Group updated', data };
  }

  @Delete('user-groups/:id')
  async deleteGroup(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const data = await this.users.deleteGroup(id, companyId);
    return { success: true, message: 'Group deleted', data };
  }

  @Post('user-groups/:id/sync')
  async syncGroup(
    @Param('id') id: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    const group = await this.users.getGroup(id, companyId);
    if (!group.isDynamic) throw new BadRequestException('Only dynamic groups can be synced');
    const data = await this.users.syncDynamicGroup(id, companyId, (group.rulesJson ?? {}) as DynamicGroupRules);
    return { success: true, message: 'Dynamic group synced', data };
  }

  // --- Directory / SSO ---

  @Get('directory-guides/:provider')
  async downloadGuide(
    @Param('provider') provider: string,
    @Res() res: Response,
  ) {
    const key = provider.toUpperCase();
    if (key !== 'SAML' && key !== 'AZURE_AD') {
      throw new BadRequestException('Guide available for SAML or AZURE_AD only');
    }
    const guide = this.users.getGuideFile(key as 'SAML' | 'AZURE_AD');
    res.setHeader('Content-Type', guide.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${guide.downloadName}"`);
    res.sendFile(guide.absolutePath);
  }

  @Get('directory-settings')
  async directorySettings(@RequireTenantCompanyId() companyId: string): Promise<ApiResponse> {
    const data = await this.users.listDirectoryConfigs(companyId);
    return { success: true, message: 'Directory settings retrieved', data };
  }

  @Patch('directory-settings/:provider')
  async upsertDirectory(
    @Param('provider') provider: string,
    @RequireTenantCompanyId() companyId: string,
    @Body() dto: { enabled?: boolean; configJson?: Record<string, unknown> },
  ): Promise<ApiResponse> {
    if (!Object.values(DirectoryProvider).includes(provider as DirectoryProvider)) {
      throw new BadRequestException('Invalid directory provider');
    }
    const data = await this.users.upsertDirectoryConfig(companyId, provider as DirectoryProvider, dto);
    return { success: true, message: 'Directory settings saved', data };
  }

  @Post('directory-settings/:provider/test')
  async testDirectory(
    @Param('provider') provider: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    if (!Object.values(DirectoryProvider).includes(provider as DirectoryProvider)) {
      throw new BadRequestException('Invalid directory provider');
    }
    const data = await this.users.testDirectoryConnection(companyId, provider as DirectoryProvider);
    return { success: true, message: 'Connection test completed', data };
  }

  @Post('directory-settings/:provider/sync')
  async syncDirectory(
    @Param('provider') provider: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    if (provider.toUpperCase() !== 'AZURE_AD') {
      throw new BadRequestException('User sync is currently available for Azure AD only');
    }
    const data = await this.users.syncAzureAdUsers(companyId, 'manual');
    return { success: true, message: 'Azure AD sync completed', data };
  }

  @Get('directory-settings/:provider/sync-runs')
  async syncRuns(
    @Param('provider') provider: string,
    @RequireTenantCompanyId() companyId: string,
  ): Promise<ApiResponse> {
    if (!Object.values(DirectoryProvider).includes(provider as DirectoryProvider)) {
      throw new BadRequestException('Invalid directory provider');
    }
    const data = await this.users.listDirectorySyncRuns(
      companyId,
      provider as DirectoryProvider,
    );
    return { success: true, message: 'Sync history retrieved', data };
  }
}
