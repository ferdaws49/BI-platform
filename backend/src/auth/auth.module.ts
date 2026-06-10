import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy'; // ← add this
import { ResetPasswordController } from './reset-password.controller';
import { InscriptionsModule } from '../inscriptions/inscriptions.module';
import { MailModule } from 'src/mail/mail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/users.entity';
import { AuthGuard } from './guards/auth.guard';
import { UsersService } from 'src/users/users.service';
import { Inscription } from 'src/inscriptions/entities/inscriptions.entity';

@Module({
  imports: [
    UsersModule,
    InscriptionsModule,
    PassportModule,
    MailModule, // ← add this
    JwtModule.register({
      secret: process.env.SECRET_KEY ?? 'SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),

    TypeOrmModule.forFeature([User, Inscription]),
  ],
  providers: [AuthService, JwtStrategy, AuthGuard], // ← add JwtStrategy
  controllers: [AuthController, ResetPasswordController],
  exports: [AuthService],
})
export class AuthModule {}
