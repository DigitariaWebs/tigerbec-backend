import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminRole } from '../../types';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.profile) {
      throw new ForbiddenException('User profile not found');
    }

    // Check if user is a super admin
    if (user.profile.role !== AdminRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can perform this action');
    }

    return true;
  }
}
