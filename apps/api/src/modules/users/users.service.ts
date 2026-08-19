import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DirectoryProvider, DirectorySyncStatus, Prisma, UserRole } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AzureAdCredentials,
  fetchAllGraphUsers,
  mapGraphUser,
  testGraphConnection,
} from './azure-ad-graph';

export interface CreateUserDto {
  email: string;
  fullName: string;
  role?: UserRole;
  departmentId?: string;
  branchId?: string;
  designation?: string;
  hrisEmployeeId?: string;
  location?: string;
  managerId?: string;
  groupIds?: string[];
}

export interface UpdateUserDto {
  fullName?: string;
  role?: UserRole;
  departmentId?: string | null;
  branchId?: string | null;
  designation?: string | null;
  hrisEmployeeId?: string | null;
  location?: string | null;
  managerId?: string | null;
  isActive?: boolean;
  groupIds?: string[];
}

export interface DynamicGroupRules {
  departmentIds?: string[];
  branchIds?: string[];
  designations?: string[];
  roles?: UserRole[];
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private userInclude = {
    department: true,
    branch: true,
    manager: { select: { id: true, fullName: true, email: true } },
    groupMemberships: { include: { group: { select: { id: true, name: true } } } },
    _count: { select: { enrollments: true, directReports: true } },
  } as const;

  private toUserDto(u: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    departmentId: string | null;
    branchId: string | null;
    designation: string | null;
    hrisEmployeeId: string | null;
    location: string | null;
    managerId: string | null;
    isActive: boolean;
    archivedAt: Date | null;
    createdAt: Date;
    department: { id: string; name: string } | null;
    branch: { id: string; name: string; code: string } | null;
    manager: { id: string; fullName: string; email: string } | null;
    groupMemberships: Array<{ group: { id: string; name: string } }>;
    _count: { enrollments: number; directReports: number };
  }) {
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      department: u.department?.name ?? 'Unassigned',
      departmentId: u.departmentId,
      branch: u.branch?.name ?? null,
      branchId: u.branchId,
      designation: u.designation,
      hrisEmployeeId: u.hrisEmployeeId,
      location: u.location,
      managerId: u.managerId,
      manager: u.manager,
      groups: u.groupMemberships.map((m) => m.group),
      isActive: u.isActive,
      archivedAt: u.archivedAt,
      enrollmentCount: u._count.enrollments,
      directReportCount: u._count.directReports,
      createdAt: u.createdAt,
    };
  }

  async listUsers(
    companyId: string,
    filters: { archived?: boolean; search?: string; departmentId?: string; branchId?: string } = {},
  ) {
    const where: Prisma.UserWhereInput = {
      companyId,
      role: { not: UserRole.SYSTEM_ADMIN },
    };

    if (filters.archived) {
      where.archivedAt = { not: null };
    } else {
      where.archivedAt = null;
    }

    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { hrisEmployeeId: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: this.userInclude,
      orderBy: { fullName: 'asc' },
    });
    return users.map((u) => this.toUserDto(u));
  }

  async createUser(companyId: string, dto: CreateUserDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const userCount = await this.prisma.user.count({
      where: { companyId, isActive: true, archivedAt: null },
    });
    if (userCount >= company.maxUsers) {
      throw new BadRequestException(
        `License limit reached (${company.maxUsers} users max). Archive a user or upgrade the license.`,
      );
    }

    const email = dto.email.trim().toLowerCase();
    if (!email || !dto.fullName?.trim()) {
      throw new BadRequestException('Full name and email are required');
    }

    const existing = await this.prisma.user.findFirst({ where: { companyId, email } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    const role = dto.role ?? UserRole.LEARNER;
    if (role === UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException('Cannot assign SYSTEM_ADMIN role from company admin');
    }

    await this.assertOrgRefs(companyId, dto);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        role,
        companyId,
        departmentId: dto.departmentId || null,
        branchId: dto.branchId || null,
        designation: dto.designation?.trim() || null,
        hrisEmployeeId: dto.hrisEmployeeId?.trim() || null,
        location: dto.location?.trim() || null,
        managerId: dto.managerId || null,
        groupMemberships: dto.groupIds?.length
          ? { create: dto.groupIds.map((groupId) => ({ groupId })) }
          : undefined,
      },
      include: this.userInclude,
    });

    return this.toUserDto(user);
  }

  async updateUser(id: string, companyId: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('User not found');
    if (dto.role === UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException('Cannot assign SYSTEM_ADMIN role');
    }
    if (dto.managerId === id) throw new BadRequestException('User cannot be their own manager');

    await this.assertOrgRefs(companyId, dto);

    if (dto.groupIds) {
      await this.prisma.userGroupMember.deleteMany({ where: { userId: id } });
      if (dto.groupIds.length) {
        await this.prisma.userGroupMember.createMany({
          data: dto.groupIds.map((groupId) => ({ userId: id, groupId })),
        });
      }
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        role: dto.role,
        departmentId: dto.departmentId === undefined ? undefined : dto.departmentId,
        branchId: dto.branchId === undefined ? undefined : dto.branchId,
        designation: dto.designation === undefined ? undefined : dto.designation?.trim() || null,
        hrisEmployeeId: dto.hrisEmployeeId === undefined ? undefined : dto.hrisEmployeeId?.trim() || null,
        location: dto.location === undefined ? undefined : dto.location?.trim() || null,
        managerId: dto.managerId === undefined ? undefined : dto.managerId,
        isActive: dto.isActive,
      },
      include: this.userInclude,
    });

    return this.toUserDto(user);
  }

  async archiveUser(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
    });
    return { archived: true };
  }

  async restoreUser(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: { isActive: true, archivedAt: null },
    });
    return { restored: true };
  }

  async deactivateUser(id: string, companyId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { deactivated: true };
  }

  // --- Org structure ---

  async listDepartments(companyId: string) {
    return this.prisma.department.findMany({
      where: { companyId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(companyId: string, dto: { name: string; code: string }) {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!name || !code) throw new BadRequestException('Name and code are required');
    return this.prisma.department.create({
      data: { companyId, name, code },
    });
  }

  async listBranches(companyId: string) {
    return this.prisma.branch.findMany({
      where: { companyId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createBranch(companyId: string, dto: { name: string; code: string; city?: string }) {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (!name || !code) throw new BadRequestException('Name and code are required');
    return this.prisma.branch.create({
      data: { companyId, name, code, city: dto.city?.trim() || null },
    });
  }

  // --- Groups ---

  async listGroups(companyId: string) {
    const groups = await this.prisma.userGroup.findMany({
      where: { companyId },
      include: { _count: { select: { members: true } } },
      orderBy: { name: 'asc' },
    });
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      isDynamic: g.isDynamic,
      rulesJson: g.rulesJson,
      memberCount: g._count.members,
      createdAt: g.createdAt,
    }));
  }

  async createGroup(
    companyId: string,
    dto: { name: string; description?: string; isDynamic?: boolean; rulesJson?: DynamicGroupRules; memberIds?: string[] },
  ) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Group name is required');

    const group = await this.prisma.userGroup.create({
      data: {
        companyId,
        name,
        description: dto.description?.trim() || null,
        isDynamic: !!dto.isDynamic,
        rulesJson: (dto.rulesJson as Prisma.InputJsonValue) ?? undefined,
      },
    });

    if (dto.isDynamic && dto.rulesJson) {
      await this.syncDynamicGroup(group.id, companyId, dto.rulesJson);
    } else if (dto.memberIds?.length) {
      await this.prisma.userGroupMember.createMany({
        data: dto.memberIds.map((userId) => ({ userId, groupId: group.id })),
        skipDuplicates: true,
      });
    }

    return this.getGroup(group.id, companyId);
  }

  async updateGroup(
    id: string,
    companyId: string,
    dto: { name?: string; description?: string; isDynamic?: boolean; rulesJson?: DynamicGroupRules; memberIds?: string[] },
  ) {
    const existing = await this.prisma.userGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Group not found');

    await this.prisma.userGroup.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
        isDynamic: dto.isDynamic,
        rulesJson: dto.rulesJson === undefined ? undefined : (dto.rulesJson as Prisma.InputJsonValue),
      },
    });

    if (dto.isDynamic || existing.isDynamic) {
      const rules = (dto.rulesJson ?? existing.rulesJson) as DynamicGroupRules | null;
      if (rules) await this.syncDynamicGroup(id, companyId, rules);
    } else if (dto.memberIds) {
      await this.prisma.userGroupMember.deleteMany({ where: { groupId: id } });
      if (dto.memberIds.length) {
        await this.prisma.userGroupMember.createMany({
          data: dto.memberIds.map((userId) => ({ userId, groupId: id })),
        });
      }
    }

    return this.getGroup(id, companyId);
  }

  async deleteGroup(id: string, companyId: string) {
    const existing = await this.prisma.userGroup.findFirst({ where: { id, companyId } });
    if (!existing) throw new NotFoundException('Group not found');
    await this.prisma.userGroup.delete({ where: { id } });
    return { deleted: true };
  }

  async getGroup(id: string, companyId: string) {
    const g = await this.prisma.userGroup.findFirst({
      where: { id, companyId },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true, email: true, designation: true } } },
        },
        _count: { select: { members: true } },
      },
    });
    if (!g) throw new NotFoundException('Group not found');
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      isDynamic: g.isDynamic,
      rulesJson: g.rulesJson,
      memberCount: g._count.members,
      members: g.members.map((m) => m.user),
      createdAt: g.createdAt,
    };
  }

  async syncDynamicGroup(groupId: string, companyId: string, rules: DynamicGroupRules) {
    const where: Prisma.UserWhereInput = {
      companyId,
      archivedAt: null,
      isActive: true,
    };
    const and: Prisma.UserWhereInput[] = [];
    if (rules.departmentIds?.length) and.push({ departmentId: { in: rules.departmentIds } });
    if (rules.branchIds?.length) and.push({ branchId: { in: rules.branchIds } });
    if (rules.designations?.length) and.push({ designation: { in: rules.designations } });
    if (rules.roles?.length) and.push({ role: { in: rules.roles } });
    if (and.length) where.AND = and;

    const matches = await this.prisma.user.findMany({ where, select: { id: true } });
    await this.prisma.userGroupMember.deleteMany({ where: { groupId } });
    if (matches.length) {
      await this.prisma.userGroupMember.createMany({
        data: matches.map((u) => ({ userId: u.id, groupId })),
      });
    }
    return { synced: matches.length };
  }

  // --- Bulk import ---

  async getImportTemplateBuffer() {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Users');
    sheet.columns = [
      { header: 'fullName', key: 'fullName', width: 24 },
      { header: 'email', key: 'email', width: 28 },
      { header: 'role', key: 'role', width: 14 },
      { header: 'employeeId', key: 'employeeId', width: 14 },
      { header: 'departmentCode', key: 'departmentCode', width: 16 },
      { header: 'branchCode', key: 'branchCode', width: 14 },
      { header: 'designation', key: 'designation', width: 18 },
      { header: 'managerEmail', key: 'managerEmail', width: 28 },
      { header: 'location', key: 'location', width: 16 },
    ];
    sheet.addRow({
      fullName: 'Jane Doe',
      email: 'jane@company.com',
      role: 'LEARNER',
      employeeId: 'EMP001',
      departmentCode: 'ENG',
      branchCode: 'HQ',
      designation: 'Software Engineer',
      managerEmail: 'manager@company.com',
      location: 'New York',
    });
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async importUsers(companyId: string, buffer: Buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = wb.worksheets[0];
    if (!sheet) throw new BadRequestException('Spreadsheet has no sheets');

    const headers: string[] = [];
    sheet.getRow(1).eachCell((cell, col) => {
      headers[col] = String(cell.value ?? '').trim();
    });

    const required = ['fullName', 'email'];
    for (const h of required) {
      if (!headers.includes(h)) {
        throw new BadRequestException(`Missing required column: ${h}`);
      }
    }

    const departments = await this.prisma.department.findMany({ where: { companyId } });
    const branches = await this.prisma.branch.findMany({ where: { companyId } });
    const deptByCode = new Map(departments.map((d) => [d.code.toUpperCase(), d.id]));
    const branchByCode = new Map(branches.map((b) => [b.code.toUpperCase(), b.id]));

    const rows: CreateUserDto[] = [];
    const errors: string[] = [];

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const get = (key: string) => {
        const col = headers.indexOf(key);
        if (col < 0) return '';
        const v = row.getCell(col).value;
        return String(typeof v === 'object' && v && 'text' in v ? (v as { text: string }).text : v ?? '').trim();
      };

      const fullName = get('fullName');
      const email = get('email').toLowerCase();
      if (!fullName && !email) return;
      if (!fullName || !email) {
        errors.push(`Row ${rowNumber}: fullName and email are required`);
        return;
      }

      const roleRaw = get('role').toUpperCase() || 'LEARNER';
      const role = (['LEARNER', 'LINE_MANAGER', 'LMS_ADMIN'].includes(roleRaw) ? roleRaw : 'LEARNER') as UserRole;
      const departmentCode = get('departmentCode').toUpperCase();
      const branchCode = get('branchCode').toUpperCase();

      rows.push({
        fullName,
        email,
        role,
        hrisEmployeeId: get('employeeId') || undefined,
        departmentId: departmentCode ? deptByCode.get(departmentCode) : undefined,
        branchId: branchCode ? branchByCode.get(branchCode) : undefined,
        designation: get('designation') || undefined,
        location: get('location') || undefined,
        // manager resolved in second pass via email stored temporarily in location? Use a side map.
      });

      (rows[rows.length - 1] as CreateUserDto & { _managerEmail?: string })._managerEmail =
        get('managerEmail').toLowerCase() || undefined;
    });

    let created = 0;
    let skipped = 0;
    const createdByEmail = new Map<string, string>();

    for (const row of rows) {
      try {
        const user = await this.createUser(companyId, row);
        createdByEmail.set(row.email, user.id);
        created += 1;
      } catch (e) {
        skipped += 1;
        errors.push(`${row.email}: ${e instanceof Error ? e.message : 'failed'}`);
      }
    }

    for (const row of rows) {
      const meta = row as CreateUserDto & { _managerEmail?: string };
      const userId = createdByEmail.get(row.email);
      if (!meta._managerEmail || !userId) continue;
      const manager = await this.prisma.user.findFirst({
        where: { companyId, email: meta._managerEmail },
      });
      if (manager) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { managerId: manager.id },
        });
      }
    }

    return { created, skipped, errors: errors.slice(0, 50), totalRows: rows.length };
  }

  // --- Directory / SSO settings ---

  async listDirectoryConfigs(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const providers = Object.values(DirectoryProvider);
    const existing = await this.prisma.directoryConfig.findMany({ where: { companyId } });
    const byProvider = new Map(existing.map((c) => [c.provider, c]));
    const sp = this.serviceProviderEndpoints(company?.slug ?? 'company');

    return providers.map((provider) => {
      const c = byProvider.get(provider);
      const defaults = this.defaultConfig(provider, sp);
      const saved = (c?.configJson as Record<string, unknown> | null) ?? {};
      return {
        provider,
        enabled: c?.enabled ?? false,
        configJson: { ...defaults, ...saved },
        lastSyncAt: c?.lastSyncAt ?? null,
        lastSyncNote: c?.lastSyncNote ?? null,
        id: c?.id ?? null,
        setup: this.setupGuide(provider, sp),
      };
    });
  }

  /** Downloadable CSM / customer integration guides */
  getGuideFile(provider: 'SAML' | 'AZURE_AD'): { absolutePath: string; downloadName: string; contentType: string } {
    // Dist layout: dist/src/modules/users → ../../../assets = dist/assets; also try project root assets
    const candidates = [
      path.join(process.cwd(), 'assets', 'guides'),
      path.join(process.cwd(), 'src', 'assets', 'guides'),
      path.join(__dirname, '..', '..', 'assets', 'guides'),
      path.join(__dirname, '..', '..', '..', 'assets', 'guides'),
      path.join(__dirname, '..', '..', '..', 'assets', 'guides', 'guides'),
      path.join(process.cwd(), 'dist', 'assets', 'guides'),
      path.join(process.cwd(), 'apps', 'api', 'assets', 'guides'),
    ];
    const fileName =
      provider === 'SAML'
        ? 'SSO_SAML_Integration_with_ProPhish.docx'
        : 'Azure_AD_user_sync_with_ProPhish.pdf';
    const dir = candidates.find((d) => fs.existsSync(path.join(d, fileName)));
    if (!dir) throw new NotFoundException(`${provider} guide not found`);
    const absolutePath = path.join(dir, fileName);
    return {
      absolutePath,
      downloadName: fileName,
      contentType:
        provider === 'SAML'
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf',
    };
  }

  private serviceProviderEndpoints(slug: string) {
    const publicBase = (process.env.PUBLIC_APP_URL ?? 'https://prophish.progist.net').replace(/\/$/, '');
    const domain = slug.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() || 'company';
    return {
      /** Identifier (Entity ID) — give this to Azure AD admin (from SAML guide) */
      entityId: `https://${domain}_progist.progist.net`,
      /** Reply URL / ACS — from SAML guide */
      acsUrl: `${publicBase}/api/openldConnect/callback`,
      publicBase,
      companySlug: domain,
    };
  }

  private setupGuide(provider: DirectoryProvider, sp: ReturnType<UsersService['serviceProviderEndpoints']>) {
    if (provider === DirectoryProvider.SAML) {
      return {
        title: 'SSO SAML with Microsoft Entra',
        guideKey: 'SAML' as const,
        guideLabel: 'Download SAML setup guide (.docx)',
        customerSteps: [
          'Sign in to Microsoft Entra admin center and create a new Enterprise application (non-gallery).',
          'Name the app (e.g. ProPhish LMS) and create it.',
          'Assign users who need SSO access — or disable “User assignment required” for the whole tenant.',
          'Open Single sign-on → choose SAML.',
          'Edit Basic SAML Configuration and paste the Identifier (Entity ID) and Reply URL from this LMS page.',
          'In Attributes & Claims, configure NameID (email recommended).',
          'Copy the Entra IdP metadata values (Login URL, Azure AD Identifier, Certificate) back into the LMS fields below and Save.',
        ],
        lmsValues: [
          { label: 'Identifier (Entity ID)', value: sp.entityId, hint: 'Paste into Azure → Basic SAML Configuration' },
          { label: 'Reply URL (ACS)', value: sp.acsUrl, hint: 'Assertion Consumer Service URL' },
        ],
        fieldLabels: {
          entityId: 'LMS Identifier / Entity ID (share with customer)',
          acsUrl: 'Reply URL / ACS callback (share with customer)',
          idpEntityId: 'Azure AD Identifier (from Entra SAML)',
          idpSsoUrl: 'Login URL / SSO URL (from Entra SAML)',
          idpCertificate: 'Base64 signing certificate (from Entra)',
          nameIdFormat: 'NameID format',
        },
      };
    }
    if (provider === DirectoryProvider.AZURE_AD) {
      return {
        title: 'Azure AD / Microsoft Entra ID User Provisioning',
        guideKey: 'AZURE_AD' as const,
        guideLabel: 'Download Azure AD sync guide (.pdf)',
        customerSteps: [
          'In Microsoft Entra admin center, register an application (e.g. ProPhish User Sync).',
          'Create a client secret under Certificates & secrets and copy the Secret value immediately.',
          'Add Microsoft Graph Application permission User.Read.All and grant admin consent (Global Administrator).',
          'Paste Directory (Tenant) ID, Application (Client) ID, and Client Secret Value into the LMS.',
          'Save settings, run Test connection (OAuth client credentials), then Sync users.',
        ],
        lmsValues: [] as { label: string; value: string; hint: string }[],
        fieldLabels: {
          tenantId: 'Directory (Tenant) ID',
          clientId: 'Application (Client) ID',
          clientSecret: 'Client Secret Value',
          graphPermission: 'Required Graph permission',
          syncIntervalHours: 'Scheduled sync interval (hours, 0 = manual only)',
          deactivateMissing: 'Archive users removed or disabled in Entra ID',
        },
      };
    }
    return {
      title: provider.replace(/_/g, ' '),
      guideKey: null as null,
      guideLabel: null as null,
      customerSteps: [] as string[],
      lmsValues: [] as { label: string; value: string; hint: string }[],
      fieldLabels: {} as Record<string, string>,
    };
  }

  async upsertDirectoryConfig(
    companyId: string,
    provider: DirectoryProvider,
    dto: { enabled?: boolean; configJson?: Record<string, unknown> },
  ) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const sp = this.serviceProviderEndpoints(company?.slug ?? 'company');
    const defaults = this.defaultConfig(provider, sp);
    const existing = await this.prisma.directoryConfig.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    const prev = (existing?.configJson as Record<string, unknown> | null) ?? {};
    const nextConfig =
      dto.configJson === undefined
        ? undefined
        : ({ ...defaults, ...prev, ...dto.configJson } as Prisma.InputJsonValue);

    return this.prisma.directoryConfig.upsert({
      where: { companyId_provider: { companyId, provider } },
      create: {
        companyId,
        provider,
        enabled: dto.enabled ?? false,
        configJson: ({ ...defaults, ...(dto.configJson ?? {}) } as Prisma.InputJsonValue),
      },
      update: {
        enabled: dto.enabled,
        configJson: nextConfig,
      },
    });
  }

  async testDirectoryConnection(companyId: string, provider: DirectoryProvider) {
    const config = await this.prisma.directoryConfig.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
    if (!config?.enabled) {
      throw new BadRequestException('Enable this integration and save settings before testing');
    }

    const cfg = (config.configJson ?? {}) as Record<string, unknown>;
    const missing = this.requiredFields(provider).filter((k) => !String(cfg[k] ?? '').trim());
    if (missing.length) {
      throw new BadRequestException(`Missing required settings: ${missing.join(', ')}`);
    }

    if (provider === DirectoryProvider.AZURE_AD) {
      try {
        const result = await testGraphConnection(this.azureCreds(cfg));
        const note = `Authenticated with Microsoft Graph (client credentials). Sample readable users: ${result.userSampleCount}. Permission: User.Read.All.`;
        await this.prisma.directoryConfig.update({
          where: { id: config.id },
          data: { lastSyncNote: note },
        });
        return { ok: true, message: note, authenticated: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Azure AD authentication failed';
        throw new BadRequestException(message);
      }
    }

    // ponytail: LDAP/SAML/SCIM live connectors not wired — field validation only
    const note = `Dry-run OK at ${new Date().toISOString()} — required ${provider} fields present.`;
    await this.prisma.directoryConfig.update({
      where: { id: config.id },
      data: { lastSyncNote: note },
    });
    return { ok: true, message: note };
  }

  async syncAzureAdUsers(companyId: string, trigger: 'manual' | 'scheduled' = 'manual') {
    const config = await this.prisma.directoryConfig.findUnique({
      where: { companyId_provider: { companyId, provider: DirectoryProvider.AZURE_AD } },
    });
    if (!config?.enabled) {
      throw new BadRequestException('Enable Azure AD and save settings before syncing');
    }

    const cfg = (config.configJson ?? {}) as Record<string, unknown>;
    const missing = this.requiredFields(DirectoryProvider.AZURE_AD).filter(
      (k) => !String(cfg[k] ?? '').trim(),
    );
    if (missing.length) {
      throw new BadRequestException(`Missing required settings: ${missing.join(', ')}`);
    }

    const deactivateMissing = cfg.deactivateMissing !== false;
    const run = await this.prisma.directorySyncRun.create({
      data: {
        companyId,
        provider: DirectoryProvider.AZURE_AD,
        directoryConfigId: config.id,
        status: DirectorySyncStatus.RUNNING,
        trigger,
      },
    });

    let importedCount = 0;
    let updatedCount = 0;
    let deactivatedCount = 0;
    let skippedCount = 0;
    const errors: { email?: string; message: string }[] = [];

    try {
      const company = await this.prisma.company.findUnique({ where: { id: companyId } });
      if (!company) throw new NotFoundException('Company not found');

      const graphUsers = await fetchAllGraphUsers(this.azureCreds(cfg));
      const mapped = graphUsers.map(mapGraphUser).filter((u): u is NonNullable<typeof u> => !!u);

      const deptCache = new Map<string, string>();
      const oidToUserId = new Map<string, string>();
      const emailToUserId = new Map<string, string>();

      // Pass 1: create / update users (managers later)
      for (const u of mapped) {
        try {
          let existing = await this.prisma.user.findFirst({
            where: {
              companyId,
              OR: [{ azureObjectId: u.azureObjectId }, { email: u.email }],
            },
          });

          const departmentId = u.departmentName
            ? await this.ensureDepartment(companyId, u.departmentName, deptCache)
            : null;

          if (!existing) {
            const activeCount = await this.prisma.user.count({
              where: { companyId, isActive: true, archivedAt: null },
            });
            if (activeCount >= company.maxUsers) {
              skippedCount += 1;
              errors.push({
                email: u.email,
                message: `Skipped create — license limit (${company.maxUsers})`,
              });
              continue;
            }

            existing = await this.prisma.user.create({
              data: {
                companyId,
                email: u.email,
                fullName: u.fullName,
                role: UserRole.LEARNER,
                azureObjectId: u.azureObjectId,
                designation: u.designation,
                location: u.location,
                departmentId,
                hrisEmployeeId: await this.safeEmployeeId(u.hrisEmployeeId),
                isActive: u.accountEnabled,
                archivedAt: u.accountEnabled ? null : new Date(),
              },
            });
            importedCount += 1;
          } else {
            await this.prisma.user.update({
              where: { id: existing.id },
              data: {
                email: u.email,
                fullName: u.fullName,
                azureObjectId: u.azureObjectId,
                designation: u.designation,
                location: u.location,
                departmentId: departmentId ?? existing.departmentId,
                hrisEmployeeId:
                  u.hrisEmployeeId && u.hrisEmployeeId !== existing.hrisEmployeeId
                    ? await this.safeEmployeeId(u.hrisEmployeeId, existing.id)
                    : undefined,
                isActive: u.accountEnabled,
                archivedAt: u.accountEnabled ? null : existing.archivedAt ?? new Date(),
              },
            });
            updatedCount += 1;
            if (!u.accountEnabled) deactivatedCount += 1;
          }

          oidToUserId.set(u.azureObjectId, existing.id);
          emailToUserId.set(u.email, existing.id);
        } catch (err) {
          errors.push({
            email: u.email,
            message: err instanceof Error ? err.message : 'Sync row failed',
          });
        }
      }

      // Pass 2: managers
      for (const u of mapped) {
        const userId = oidToUserId.get(u.azureObjectId);
        if (!userId) continue;
        const managerId =
          (u.managerAzureObjectId && oidToUserId.get(u.managerAzureObjectId)) ||
          (u.managerEmail && emailToUserId.get(u.managerEmail)) ||
          null;
        if (!managerId || managerId === userId) continue;
        try {
          await this.prisma.user.update({ where: { id: userId }, data: { managerId } });
        } catch (err) {
          errors.push({
            email: u.email,
            message: err instanceof Error ? err.message : 'Manager link failed',
          });
        }
      }

      // Pass 3: archive LMS users previously synced from Entra but missing / disabled upstream
      if (deactivateMissing) {
        const seenOids = new Set(mapped.map((u) => u.azureObjectId));
        const provisioned = await this.prisma.user.findMany({
          where: { companyId, azureObjectId: { not: null }, archivedAt: null },
          select: { id: true, azureObjectId: true, email: true },
        });
        for (const p of provisioned) {
          if (p.azureObjectId && seenOids.has(p.azureObjectId)) continue;
          // still in Entra but disabled already handled in pass 1; missing from directory → archive
          if (p.azureObjectId && !seenOids.has(p.azureObjectId)) {
            await this.prisma.user.update({
              where: { id: p.id },
              data: { isActive: false, archivedAt: new Date() },
            });
            deactivatedCount += 1;
          }
        }
      }

      const errorCount = errors.length;
      const status =
        errorCount === 0
          ? DirectorySyncStatus.SUCCESS
          : importedCount + updatedCount > 0
            ? DirectorySyncStatus.PARTIAL
            : DirectorySyncStatus.FAILED;

      const note = `Sync ${status.toLowerCase()}: +${importedCount} imported, ${updatedCount} updated, ${deactivatedCount} deactivated, ${skippedCount} skipped, ${errorCount} errors`;
      const finished = await this.prisma.directorySyncRun.update({
        where: { id: run.id },
        data: {
          status,
          finishedAt: new Date(),
          importedCount,
          updatedCount,
          deactivatedCount,
          skippedCount,
          errorCount,
          errorsJson: errors.slice(0, 100) as Prisma.InputJsonValue,
          note,
        },
      });

      await this.prisma.directoryConfig.update({
        where: { id: config.id },
        data: { lastSyncAt: new Date(), lastSyncNote: note },
      });

      return finished;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Azure AD sync failed';
      await this.prisma.directorySyncRun.update({
        where: { id: run.id },
        data: {
          status: DirectorySyncStatus.FAILED,
          finishedAt: new Date(),
          errorCount: 1,
          errorsJson: [{ message }] as Prisma.InputJsonValue,
          note: message,
        },
      });
      await this.prisma.directoryConfig.update({
        where: { id: config.id },
        data: { lastSyncNote: message },
      });
      throw new BadRequestException(message);
    }
  }

  async listDirectorySyncRuns(companyId: string, provider?: DirectoryProvider, take = 20) {
    return this.prisma.directorySyncRun.findMany({
      where: { companyId, ...(provider ? { provider } : {}) },
      orderBy: { startedAt: 'desc' },
      take,
    });
  }

  /** Called from JobsService — sync tenants whose interval has elapsed */
  async runDueAzureSyncs() {
    const configs = await this.prisma.directoryConfig.findMany({
      where: { provider: DirectoryProvider.AZURE_AD, enabled: true },
    });
    let ran = 0;
    for (const config of configs) {
      const cfg = (config.configJson ?? {}) as Record<string, unknown>;
      const hours = Number(cfg.syncIntervalHours ?? 0);
      if (!hours || hours <= 0) continue;
      const dueAt = config.lastSyncAt
        ? new Date(config.lastSyncAt.getTime() + hours * 60 * 60 * 1000)
        : new Date(0);
      if (dueAt > new Date()) continue;
      try {
        await this.syncAzureAdUsers(config.companyId, 'scheduled');
        ran += 1;
      } catch {
        // lastSyncNote already updated inside sync
      }
    }
    return { ran };
  }

  private azureCreds(cfg: Record<string, unknown>): AzureAdCredentials {
    return {
      tenantId: String(cfg.tenantId ?? '').trim(),
      clientId: String(cfg.clientId ?? '').trim(),
      clientSecret: String(cfg.clientSecret ?? '').trim(),
    };
  }

  private async ensureDepartment(
    companyId: string,
    name: string,
    cache: Map<string, string>,
  ): Promise<string> {
    const key = name.trim().toLowerCase();
    const cached = cache.get(key);
    if (cached) return cached;

    const existing = await this.prisma.department.findFirst({
      where: { companyId, name: { equals: name.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      cache.set(key, existing.id);
      return existing.id;
    }

    const codeBase = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .slice(0, 24) || 'DEPT';
    let code = codeBase;
    let n = 1;
    while (await this.prisma.department.findFirst({ where: { companyId, code } })) {
      code = `${codeBase}_${n++}`.slice(0, 32);
    }
    const created = await this.prisma.department.create({
      data: { companyId, name: name.trim(), code },
    });
    cache.set(key, created.id);
    return created.id;
  }

  /** Avoid global hrisEmployeeId unique collisions across tenants */
  private async safeEmployeeId(employeeId: string | null, excludeUserId?: string): Promise<string | null> {
    if (!employeeId) return null;
    const clash = await this.prisma.user.findFirst({
      where: {
        hrisEmployeeId: employeeId,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    return clash ? null : employeeId;
  }

  private defaultConfig(
    provider: DirectoryProvider,
    sp?: ReturnType<UsersService['serviceProviderEndpoints']>,
  ): Record<string, unknown> {
    const endpoints = sp ?? this.serviceProviderEndpoints('company');
    switch (provider) {
      case DirectoryProvider.LDAP:
      case DirectoryProvider.ACTIVE_DIRECTORY:
        return {
          host: '',
          port: 389,
          baseDn: '',
          bindDn: '',
          bindPassword: '',
          userFilter: '(objectClass=user)',
          useSsl: false,
        };
      case DirectoryProvider.AZURE_AD:
        return {
          tenantId: '',
          clientId: '',
          clientSecret: '',
          graphPermission: 'User.Read.All',
          syncIntervalHours: 24,
          deactivateMissing: true,
        };
      case DirectoryProvider.SAML:
        return {
          entityId: endpoints.entityId,
          acsUrl: endpoints.acsUrl,
          idpEntityId: '',
          idpSsoUrl: '',
          idpCertificate: '',
          nameIdFormat: 'email',
        };
      case DirectoryProvider.SCIM:
        return {
          bearerToken: '',
          baseUrl: '',
          autoProvision: true,
          autoDeprovision: true,
        };
      default:
        return {};
    }
  }

  private requiredFields(provider: DirectoryProvider): string[] {
    switch (provider) {
      case DirectoryProvider.LDAP:
      case DirectoryProvider.ACTIVE_DIRECTORY:
        return ['host', 'baseDn', 'bindDn'];
      case DirectoryProvider.AZURE_AD:
        return ['tenantId', 'clientId', 'clientSecret'];
      case DirectoryProvider.SAML:
        return ['entityId', 'acsUrl', 'idpEntityId', 'idpSsoUrl', 'idpCertificate'];
      case DirectoryProvider.SCIM:
        return ['bearerToken'];
      default:
        return [];
    }
  }

  private async assertOrgRefs(
    companyId: string,
    dto: { departmentId?: string | null; branchId?: string | null; managerId?: string | null; groupIds?: string[] },
  ) {
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({ where: { id: dto.departmentId, companyId } });
      if (!dept) throw new BadRequestException('Department not found');
    }
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, companyId } });
      if (!branch) throw new BadRequestException('Branch not found');
    }
    if (dto.managerId) {
      const manager = await this.prisma.user.findFirst({ where: { id: dto.managerId, companyId } });
      if (!manager) throw new BadRequestException('Manager not found');
    }
    if (dto.groupIds?.length) {
      const count = await this.prisma.userGroup.count({
        where: { companyId, id: { in: dto.groupIds } },
      });
      if (count !== dto.groupIds.length) throw new BadRequestException('One or more groups not found');
    }
  }
}
