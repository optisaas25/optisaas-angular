import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Minimum role tier required to hit this route: 'employee' | 'manager' | 'admin' | 'superadmin'.
 * A superadmin (or a user with the required role or higher on the active
 * tenant) is always allowed. Routes without this decorator are only gated
 * by AuthGuard (authentication + tenant membership), not by role tier.
 */
export const Roles = (...roles: Array<'employee' | 'manager' | 'admin' | 'superadmin'>) =>
  SetMetadata(ROLES_KEY, roles);
