import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InscriptionsService } from '../inscriptions/inscriptions.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private inscriptionsService: InscriptionsService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = (email ?? '').trim();
    const users = await this.usersService.findByEmail(normalizedEmail);

    if (!users) {
      throw new UnauthorizedException('User not found or wrong email');
    }

    // Manual inserts in Supabase often introduce hidden whitespace/newlines.
    // Normalize both values before comparing to avoid false "Wrong password".
    const storedHash = (users.password ?? '').trim();
    const rawPassword = password ?? '';
    let isMatch = await bcrypt.compare(rawPassword, storedHash);
    if (!isMatch && rawPassword !== rawPassword.trim()) {
      isMatch = await bcrypt.compare(rawPassword.trim(), storedHash);
    }

    if (!isMatch) {
      throw new UnauthorizedException('Wrong password');
    }

    if (!users.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    if (users.status !== 'accepted') {
      throw new UnauthorizedException('Account not accepted');
    }

    const payload = {
      sub: users.id,
      email: users.email,
      role: users.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      role: users.role,
    };
  }

  async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.inscriptionsService.create({
      ...data,
      password: hashedPassword,
    });
  }

  async verifyEmail(token: string) {
    return this.inscriptionsService.verify(token);
  }
}
