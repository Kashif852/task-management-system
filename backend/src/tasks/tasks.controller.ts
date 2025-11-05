import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() currentUser: User) {
    return this.tasksService.create(createTaskDto, currentUser.id);
  }

  @Get()
  async findAll(@CurrentUser() currentUser: User) {
    return this.tasksService.findAll(currentUser);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const canAccess = await this.tasksService.canAccessTask(
      id,
      currentUser.id,
      currentUser.role,
    );

    if (!canAccess) {
      throw new ForbiddenException('Access denied');
    }

    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.tasksService.update(id, updateTaskDto, currentUser);
  }

  @Patch(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() assignTaskDto: AssignTaskDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.tasksService.assign(id, assignTaskDto, currentUser);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.tasksService.remove(id, currentUser);
  }
}

