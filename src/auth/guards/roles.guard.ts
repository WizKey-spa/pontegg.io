import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isActive = await super.canActivate(context);
    if (!isActive) {
      return false;
    }
    const allowedGroups = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // we authorize if no roles are specified
    if (!allowedGroups || allowedGroups.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return allowedGroups.some((group) => user.groups.includes(group));
  }
}
