import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    // Allow all authenticated users to view users list (needed for task assignment)
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    // Users can only view their own profile unless they're Admin
    if (currentUser.role !== UserRole.Admin && currentUser.id !== id) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.usersService.updateProfile(currentUser.id, updateProfileDto);
  }
}

