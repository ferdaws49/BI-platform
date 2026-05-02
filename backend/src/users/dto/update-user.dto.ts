import { IsEmail, IsEnum, IsBoolean, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../users.entity';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  nom?: string;

@IsString()
@IsOptional()
prenom?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}