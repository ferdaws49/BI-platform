import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';  // ← add this
import { ResetPasswordController } from './reset-password.controller';
import { InscriptionsModule } from '../inscriptions/inscriptions.module';

@Module({
  imports: [
    UsersModule,
    InscriptionsModule,
    PassportModule,                             // ← add this
    JwtModule.register({
      secret: 'SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy],        // ← add JwtStrategy
  controllers: [AuthController, ResetPasswordController],
})
export class AuthModule {}