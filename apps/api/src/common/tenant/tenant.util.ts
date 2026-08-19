import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthUser } from '../decorators/current-user.decorator';

export function resolveTenantCompanyId(
  user: AuthUser,
  headerCompanyId?: string,
): string | null {
  if (user.role === UserRole.SYSTEM_ADMIN) {
    return headerCompanyId?.trim() || null;
  }
  if (user.role === UserRole.LMS_ADMIN) {
    if (!user.companyId) {
      throw new BadRequestException('Company admin is not assigned to a company');
    }
    return user.companyId;
  }
  throw new ForbiddenException('Admin access required');
}

export function requireTenantCompanyId(
  user: AuthUser,
  headerCompanyId?: string,
): string {
  const companyId = resolveTenantCompanyId(user, headerCompanyId);
  if (!companyId) {
    throw new BadRequestException(
      'Select a company from the switcher to access this section',
    );
  }
  return companyId;
}
