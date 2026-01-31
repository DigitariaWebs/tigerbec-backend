import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject('SUPABASE_CLIENT') private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;
      const role = payload.role;

      // Check if this is an admin user
      if (role === 'admin') {
        const { data: adminProfile, error: adminError } = await this.supabase
          .from('admins')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (adminProfile && !adminError) {
          request.user = {
            id: userId,
            email: payload.email,
            role: 'admin',
            profile: adminProfile,
          };
          return true;
        }
      }

      // Check members table
      if (role === 'member') {
        const { data: memberProfile, error: memberError } = await this.supabase
          .from('members')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (memberProfile && !memberError) {
          request.user = {
            id: userId,
            email: payload.email,
            role: 'member',
            profile: memberProfile,
          };
          return true;
        }
      }

      throw new UnauthorizedException('User profile not found');
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
