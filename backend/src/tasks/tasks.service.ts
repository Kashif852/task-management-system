import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Task, TaskStatus } from './entities/task.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { EventsGateway } from '../events/events.gateway';
import { EventLogService } from '../events/event-log.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private eventsGateway: EventsGateway,
    private eventLogService: EventLogService,
  ) {}

  async create(createTaskDto: CreateTaskDto, creatorId: string): Promise<Task> {
    const task = this.taskRepository.create({
      ...createTaskDto,
      creatorId,
      status: TaskStatus.Todo,
    });

    const savedTask = await this.taskRepository.save(task);
    const taskWithRelations = await this.findOne(savedTask.id);

    // Invalidate all task caches
    await this.invalidateAllTaskCaches();

    // Log event
    await this.eventLogService.logEvent({
      action: 'TASK_CREATED',
      userId: creatorId,
      details: { taskId: savedTask.id, title: savedTask.title },
    });

    // Emit WebSocket event
    this.eventsGateway.emitTaskUpdated(taskWithRelations);

    return taskWithRelations;
  }

  private async invalidateAllTaskCaches(): Promise<void> {
    // Clear all task-related caches
    const store = this.cacheManager.store;
    const keys = await store.keys();
    const taskKeys = keys.filter(key => key.startsWith('tasks'));
    await Promise.all(taskKeys.map(key => this.cacheManager.del(key)));
  }

  async findAll(currentUser: User): Promise<Task[]> {
    const cacheKey = `tasks:${currentUser.id}`;
    const cached = await this.cacheManager.get<Task[]>(cacheKey);

    if (cached) {
      return cached;
    }

    let tasks: Task[];

    if (currentUser.role === UserRole.Admin) {
      tasks = await this.taskRepository.find({
        relations: ['creator', 'assignee'],
        order: { createdAt: 'DESC' },
      });
    } else {
      tasks = await this.taskRepository.find({
        where: [
          { creatorId: currentUser.id },
          { assigneeId: currentUser.id },
        ],
        relations: ['creator', 'assignee'],
        order: { createdAt: 'DESC' },
      });
    }

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, tasks, 300000);

    return tasks;
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['creator', 'assignee'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    currentUser: User,
  ): Promise<Task> {
    const task = await this.findOne(id);

    // Check permissions: Admin, creator, or assignee can update
    if (
      currentUser.role !== UserRole.Admin &&
      task.creatorId !== currentUser.id &&
      task.assigneeId !== currentUser.id
    ) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    Object.assign(task, updateTaskDto);
    const updatedTask = await this.taskRepository.save(task);

    // Invalidate all task caches
    await this.invalidateAllTaskCaches();

    // Log event
    await this.eventLogService.logEvent({
      action: 'TASK_UPDATED',
      userId: currentUser.id,
      details: { taskId: id, changes: updateTaskDto },
    });

    // Emit WebSocket event
    this.eventsGateway.emitTaskUpdated(updatedTask);

    return updatedTask;
  }

  async assign(
    id: string,
    assignTaskDto: AssignTaskDto,
    currentUser: User,
  ): Promise<Task> {
    const task = await this.findOne(id);

    // Check permissions: Admin or creator can assign
    if (
      currentUser.role !== UserRole.Admin &&
      task.creatorId !== currentUser.id
    ) {
      throw new ForbiddenException('You do not have permission to assign this task');
    }

    // Validate assignee if provided
    if (assignTaskDto.assigneeId) {
      const assignee = await this.userRepository.findOne({
        where: { id: assignTaskDto.assigneeId },
      });

      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }

      task.assigneeId = assignTaskDto.assigneeId;
    } else {
      task.assigneeId = null;
    }

    const updatedTask = await this.taskRepository.save(task);

    // Invalidate all task caches
    await this.invalidateAllTaskCaches();

    // Log event
    await this.eventLogService.logEvent({
      action: 'TASK_ASSIGNED',
      userId: currentUser.id,
      details: {
        taskId: id,
        assigneeId: assignTaskDto.assigneeId || null,
      },
    });

    // Emit WebSocket event
    this.eventsGateway.emitTaskUpdated(updatedTask);

    return updatedTask;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const task = await this.findOne(id);

    // Check permissions: Only Admin or creator can delete
    if (
      currentUser.role !== UserRole.Admin &&
      task.creatorId !== currentUser.id
    ) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    await this.taskRepository.remove(task);

    // Invalidate all task caches
    await this.invalidateAllTaskCaches();

    // Log event
    await this.eventLogService.logEvent({
      action: 'TASK_DELETED',
      userId: currentUser.id,
      details: { taskId: id },
    });

    // Emit WebSocket event
    this.eventsGateway.emitTaskDeleted(id);
  }

  async canAccessTask(taskId: string, userId: string, userRole: UserRole): Promise<boolean> {
    if (userRole === UserRole.Admin) {
      return true;
    }

    const task = await this.findOne(taskId);
    return task.creatorId === userId || task.assigneeId === userId;
  }
}

