import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { Request } from 'express';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const method = request.method;
    const url = request.url;

    const isAdminMutation =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
      url.includes('/admin/');

    return next.handle().pipe(
      tap(async (responseBody) => {
        if (!isAdminMutation) {
          return;
        }

        const user = request.user;
        await this.prisma.auditLog.create({
          data: {
            userId: user?.id,
            action: `${method} ${url}`,
            resource: url.split('?')[0],
            ipAddress: request.ip ?? request.headers['x-forwarded-for']?.toString(),
            metadataJson: JSON.parse(
              JSON.stringify({
                method,
                body: request.body,
                response: responseBody,
              }),
            ),
          },
        });
      }),
    );
  }
}
