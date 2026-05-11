// auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export type Role = 'directeur' | 'resp_pedagogique' | 'admin' | 'resp_financier' |'apprenant';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);