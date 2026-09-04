import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  let service: {
    createTask: jest.Mock;
    createBulkTasks: jest.Mock;
    completeTask: jest.Mock;
    updateTaskStatus: jest.Mock;
    getTitleSuggestions: jest.Mock;
    getTasksByUser: jest.Mock;
    getCohort: jest.Mock;
    getTasksByScholar: jest.Mock;
    updateTask: jest.Mock;
    softDeleteTask: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createTask: jest.fn(),
      createBulkTasks: jest.fn(),
      completeTask: jest.fn(),
      updateTaskStatus: jest.fn(),
      getTitleSuggestions: jest.fn(),
      getTasksByUser: jest.fn(),
      getCohort: jest.fn(),
      getTasksByScholar: jest.fn(),
      updateTask: jest.fn(),
      softDeleteTask: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();

    controller = module.get(TasksController);
  });

  it('creates an individual task', async () => {
    service.createTask.mockResolvedValue({ id: 'task-1' });
    const result = await controller.createTask(
      {
        title: 'IELTS booking',
        type: 'other',
        dueDate: '2026-10-01',
        scholarId: 'scholar-1',
      },
      { user: { id: 'staff-1' } }
    );
    expect(service.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ scholarId: 'scholar-1' }),
      'staff-1'
    );
    expect(result).toEqual({ id: 'task-1' });
  });

  it('assigns a cohort via programStage', async () => {
    service.createBulkTasks.mockResolvedValue({ created: 4, tasks: [] });
    const result = await controller.createBulkTasks(
      {
        title: 'Connect signup',
        type: 'other',
        dueDate: '2026-10-01',
        programStage: 'prep_year',
      },
      { user: { id: 'staff-1' } }
    );
    expect(service.createBulkTasks).toHaveBeenCalledWith(
      expect.objectContaining({ programStage: 'prep_year' }),
      'staff-1'
    );
    expect(result.created).toBe(4);
  });

  it('completes a task for the authenticated scholar', async () => {
    service.completeTask.mockResolvedValue({ task: { id: 'task-1', status: 'completed' } });
    await controller.completeTask('task-1', { responseText: 'Done' }, { user: { id: 'user-1' } });
    expect(service.completeTask).toHaveBeenCalledWith('task-1', { responseText: 'Done' }, 'user-1');
  });

  it('guards GET /cohort with StaffGuard on a static path', () => {
    expect(Reflect.getMetadata(PATH_METADATA, TasksController.prototype.getCohort)).toBe('cohort');
    expect(Reflect.getMetadata(METHOD_METADATA, TasksController.prototype.getCohort)).toBe(
      RequestMethod.GET
    );
    expect(Reflect.getMetadata(GUARDS_METADATA, TasksController.prototype.getCohort)).toEqual(
      expect.arrayContaining([StaffGuard])
    );
    expect(Reflect.getMetadata(PATH_METADATA, TasksController.prototype.getTasksByScholar)).toBe(
      'scholar/:scholarId'
    );
  });

  it('forwards cohort query filters to the service', async () => {
    service.getCohort.mockResolvedValue({ columns: [], scholars: [], summary: {} });
    const query = { phase: 'english', state: 'overdue' as const };
    await controller.getCohort(query);
    expect(service.getCohort).toHaveBeenCalledWith(query);
  });

  it('passes the actor into status updates', async () => {
    service.updateTaskStatus.mockResolvedValue({ id: 'task-1', status: 'in_progress' });
    await controller.updateTaskStatus('task-1', 'in_progress', { user: { id: 'user-1' } });
    expect(service.updateTaskStatus).toHaveBeenCalledWith('task-1', 'in_progress', 'user-1');
  });
});
