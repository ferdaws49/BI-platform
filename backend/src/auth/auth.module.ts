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
import { Inscription } from 'src/inscriptions/entities/inscriptions.entity';


const JWT_SECRET = process.env.SECRET_KEY || 'thisIsPrivateKeykljdfkdkfl1323SFDEREREDDD';
@Module({
  imports: [
    UsersModule,
    InscriptionsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MailModule, // ← add this
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),

    TypeOrmModule.forFeature([User, Inscription]),
  ],
  providers: [AuthService, JwtStrategy], // ← add JwtStrategy
  controllers: [AuthController, ResetPasswordController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
