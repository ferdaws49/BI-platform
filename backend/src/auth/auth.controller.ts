import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Get('verify/:token')
  verify(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}
