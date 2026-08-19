import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './current-user.decorator';
import { requireTenantCompanyId, resolveTenantCompanyId } from '../tenant/tenant.util';

export const TenantCompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{
      user: AuthUser;
      headers: Record<string, string | undefined>;
    }>();
    const header = request.headers['x-company-context'];
    return resolveTenantCompanyId(request.user, header);
  },
);

export const RequireTenantCompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{
      user: AuthUser;
      headers: Record<string, string | undefined>;
    }>();
    const header = request.headers['x-company-context'];
    return requireTenantCompanyId(request.user, header);
  },
);
