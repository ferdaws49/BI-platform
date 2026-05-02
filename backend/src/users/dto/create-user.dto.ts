//hathi teb3aaa el admin ki y3mel creation l user min 3endou
import { IsEmail, IsEnum, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../users.entity';

export class CreateUserDto {
  @IsString()
    nom: string;
@IsString()
    prenom: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
