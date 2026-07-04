import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { requireEnv } from '../config/require-env';

/**
 * Global authentication + tenant-authorization guard.
 *
 * Verifies the JWT (no fallback secret - a missing JWT_SECRET is a fatal
 * config error, never a known default). If the request carries a `Tenant`
 * header, it is checked against the caller's actual UserCentreRole rows -
 * previously that header was trusted as-is, letting any authenticated user
 * read/write another center's data by just changing the header.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant');
    }

    const token = authHeader.substring(7);
    const secret = requireEnv(this.configService, 'JWT_SECRET');

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (e) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    const centreRoles = await this.prisma.userCentreRole.findMany({
      where: { userId: payload.sub },
    });

    const isSuperAdmin = centreRoles.some((cr) =>
      cr.role?.toLowerCase().includes('super'),
    );

    const tenantHeader: string | undefined = request.headers['tenant'];
    if (tenantHeader) {
      const hasAccess =
        isSuperAdmin || centreRoles.some((cr) => cr.centreId === tenantHeader);
      if (!hasAccess) {
        throw new ForbiddenException(
          "Vous n'avez pas accès à ce centre",
        );
      }
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      centreId: tenantHeader,
      isSuperAdmin,
      centreRoles: centreRoles.map((cr) => ({
        centreId: cr.centreId,
        centreName: cr.centreName,
        role: cr.role,
      })),
    };

    return true;
  }
}
