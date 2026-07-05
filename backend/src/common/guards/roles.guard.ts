import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { mapRoleToRoleId } from '../auth/role.util';
import { RequestUser } from '../decorators/current-user.decorator';

const TIER_ORDER = ['employee', 'manager', 'admin', 'superadmin'] as const;

/**
 * Role-tier gate for sensitive routes (user management, payroll, accounting
 * exports, etc). Runs after AuthGuard, which already guarantees request.user
 * is populated. A user passes if their highest role across ANY of their
 * centres meets the route's minimum required tier - these routes are mostly
 * not centre-scoped, so "best role anywhere" is the right check rather than
 * the currently-selected tenant only.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (user.isSuperAdmin) return true;

    const userMaxTier = Math.max(
      1,
      ...user.centreRoles.map((cr) => mapRoleToRoleId(cr.role)),
    );
    const requiredTier = Math.min(
      ...requiredRoles.map((r) => TIER_ORDER.indexOf(r as any) + 1),
    );

    if (userMaxTier >= requiredTier) return true;

    throw new ForbiddenException(
      "Votre rôle ne permet pas d'effectuer cette action",
    );
  }
}
