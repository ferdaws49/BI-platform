import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {

  constructor(private readonly usersService: UsersService) {}

  // GET /admin/users/roles
  @Get('roles')
  getRoles() {
    return this.usersService.getRoles();
  }

  // GET /admin/users
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // GET /admin/users/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // POST /admin/users
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
  // PATCH /admin/users/:id/toggle-active
  @Patch(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleActive(id);
  }

  // PATCH /admin/users/:id
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  

  // DELETE /admin/users/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  // POST /admin/users/:id/reset-password
  @Post(':id/reset-password')
  requestResetPassword(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.requestResetPassword(id);
  }
}