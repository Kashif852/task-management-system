import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TasksService } from './tasks.service';
import { Task, TaskStatus } from './entities/task.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { EventsGateway } from '../events/events.gateway';
import { EventLogService } from '../events/event-log.service';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: Repository<Task>;
  let userRepository: Repository<User>;
  let cacheManager: any;
  let eventsGateway: EventsGateway;
  let eventLogService: EventLogService;

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockEventsGateway = {
    emitTaskUpdated: jest.fn(),
    emitTaskDeleted: jest.fn(),
    emitTaskAssigned: jest.fn(),
  };

  const mockEventLogService = {
    logEvent: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-id',
    email: 'user@example.com',
    password: 'hashed',
    role: UserRole.User,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdTasks: [],
    assignedTasks: [],
  };

  const mockTask: Task = {
    id: 'task-id',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.Todo,
    creatorId: 'user-id',
    assigneeId: null,
    creator: mockUser,
    assignee: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: EventLogService,
          useValue: mockEventLogService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    cacheManager = module.get(CACHE_MANAGER);
    eventsGateway = module.get<EventsGateway>(EventsGateway);
    eventLogService = module.get<EventLogService>(EventLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createTaskDto: CreateTaskDto = {
      title: 'New Task',
      description: 'New Description',
    };

    it('should create a task successfully', async () => {
      mockTaskRepository.create.mockReturnValue({
        ...createTaskDto,
        creatorId: mockUser.id,
        status: TaskStatus.Todo,
      });
      mockTaskRepository.save.mockResolvedValue({
        id: 'new-task-id',
        ...createTaskDto,
        creatorId: mockUser.id,
        status: TaskStatus.Todo,
      });
      mockTaskRepository.findOne.mockResolvedValue({
        ...mockTask,
        id: 'new-task-id',
        ...createTaskDto,
      });

      const result = await service.create(createTaskDto, mockUser.id);

      expect(result).toHaveProperty('id');
      expect(result.creatorId).toBe(mockUser.id);
      expect(mockCacheManager.del).toHaveBeenCalledWith('tasks');
      expect(mockEventLogService.logEvent).toHaveBeenCalled();
      expect(mockEventsGateway.emitTaskUpdated).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all tasks for admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.Admin };
      mockCacheManager.get.mockResolvedValue(null);
      mockTaskRepository.find.mockResolvedValue([mockTask]);

      const result = await service.findAll(adminUser);

      expect(result).toHaveLength(1);
      expect(mockTaskRepository.find).toHaveBeenCalled();
    });

    it('should return cached tasks if available', async () => {
      const cachedTasks = [mockTask];
      mockCacheManager.get.mockResolvedValue(cachedTasks);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(cachedTasks);
      expect(mockTaskRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a task by id', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.findOne(mockTask.id);

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateTaskDto: UpdateTaskDto = {
      title: 'Updated Title',
      status: TaskStatus.InProgress,
    };

    it('should update task if user is creator', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, ...updateTaskDto });

      const result = await service.update(mockTask.id, updateTaskDto, mockUser);

      expect(result.title).toBe(updateTaskDto.title);
      expect(result.status).toBe(updateTaskDto.status);
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      const unauthorizedUser = { ...mockUser, id: 'other-user-id' };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(
        service.update(mockTask.id, updateTaskDto, unauthorizedUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assign', () => {
    const assignTaskDto: AssignTaskDto = {
      assigneeId: 'assignee-id',
    };

    it('should assign task successfully', async () => {
      const assignee = { ...mockUser, id: 'assignee-id' };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockUserRepository.findOne.mockResolvedValue(assignee);
      mockTaskRepository.save.mockResolvedValue({
        ...mockTask,
        assigneeId: 'assignee-id',
      });

      const result = await service.assign(mockTask.id, assignTaskDto, mockUser);

      expect(result.assigneeId).toBe('assignee-id');
      expect(mockEventLogService.logEvent).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not creator or admin', async () => {
      const unauthorizedUser = { ...mockUser, id: 'other-user-id' };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(
        service.assign(mockTask.id, assignTaskDto, unauthorizedUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete task if user is creator', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.remove.mockResolvedValue(mockTask);

      await service.remove(mockTask.id, mockUser);

      expect(mockTaskRepository.remove).toHaveBeenCalled();
      expect(mockEventLogService.logEvent).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not authorized to delete', async () => {
      const unauthorizedUser = { ...mockUser, id: 'other-user-id' };
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      await expect(service.remove(mockTask.id, unauthorizedUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

