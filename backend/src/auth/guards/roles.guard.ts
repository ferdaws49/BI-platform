import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());

    // if we don't have roles → route public
    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    const user= request.user;

    // ❌ ما فماش user (token invalid / مش connecté)
    if (!user) {
      throw new UnauthorizedException("Utilisateur non authentifié");
    }

    // role non autorisé a accées
    if (!roles.includes(user.role)) {
      throw new ForbiddenException("Accès refusé: rôle non autorisé");
    }

    // ✅ accès autorisé
    return true;
  }
}