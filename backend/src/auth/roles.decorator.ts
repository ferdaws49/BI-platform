// auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export type Role = 'directeur' | 'resp_pedagogique' | 'admin';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);