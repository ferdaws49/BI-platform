import { SetMetadata } from '@nestjs/common';
import { UserRole } from "src/users/users.entity";

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);