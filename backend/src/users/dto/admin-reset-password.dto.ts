// ✅ DTO جديد منفصل للـ admin flow
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}