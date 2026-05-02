import { Controller, Post, Body } from '@nestjs/common';
import { UsersService } from '../users/users.service';

// ✅ À mettre dans dto/reset-password.dto.ts
import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

@Controller('auth')
export class ResetPasswordController {
  constructor(private readonly usersService: UsersService) {}

  // POST /auth/reset-password  ← pas de JWT guard (utilisateur non connecté)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto.token, dto.newPassword);
  }
}
