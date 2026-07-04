import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
  centreId?: string;
  isSuperAdmin: boolean;
  centreRoles: { centreId: string; centreName: string; role: string }[];
}

/** Extracts the authenticated user attached to the request by AuthGuard. */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
