import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDatabase } from '../db/connection';
import { EmailService } from '../email/email.service';
import { ObjectStorageService } from '../storage/object-storage';
import { TasksService } from './tasks.service';

jest.mock('../db/connection', () => ({
  getDatabase: jest.fn(),
}));

describe('TasksService', () => {
  let service: TasksService;
  let emailService: { sendTaskAssignmentNotification: jest.Mock };
  let objectStorage: { headObject: jest.Mock };

  const createdTask = {
    id: 'task-1',
    title: 'Submit transcript',
    description: 'Upload the file',
    type: 'document_upload',
    priority: 'medium',
    dueDate: new Date('2026-12-31'),
    phase: 'english',
    assignmentGroupId: null,
    requiresResponse: false,
    requiresAttachment: true,
    requiresLink: false,
    scholarId: 'scholar-1',
    assignedBy: 'staff-1',
    status: 'pending',
    deletedAt: null,
  };

  function chain(result: unknown[] = []) {
    const resolved = Promise.resolve(result);
    const terminal = Object.assign(resolved, {
      limit: () => resolved,
      orderBy: () => resolved,
    });
    const api: {
      from: jest.Mock;
      innerJoin: jest.Mock;
      leftJoin: jest.Mock;
      where: jest.Mock;
      groupBy: jest.Mock;
      orderBy: jest.Mock;
      limit: jest.Mock;
    } = {
      from: jest.fn(),
      innerJoin: jest.fn(),
      leftJoin: jest.fn(),
      where: jest.fn(),
      groupBy: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
    };
    api.from.mockReturnValue(api);
    api.innerJoin.mockReturnValue(api);
    api.leftJoin.mockReturnValue(api);
    api.groupBy.mockReturnValue(api);
    api.where.mockReturnValue(terminal);
    api.orderBy.mockReturnValue(resolved);
    api.limit.mockReturnValue(resolved);
    return api;
  }

  beforeEach(async () => {
    emailService = {
      sendTaskAssignmentNotification: jest.fn().mockResolvedValue(undefined),
    };
    objectStorage = {
      headObject: jest
        .fn()
        .mockResolvedValue({ contentLength: 12, contentType: 'application/pdf' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: EmailService, useValue: emailService },
        { provide: ObjectStorageService, useValue: objectStorage },
      ],
    }).compile();

    service = module.get(TasksService);
    jest.clearAllMocks();
    objectStorage.headObject.mockResolvedValue({
      contentLength: 12,
      contentType: 'application/pdf',
    });
  });

  it('creates an individual task with type-based evidence defaults', async () => {
    const insertReturning = jest.fn().mockResolvedValue([createdTask]);
    const db = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: insertReturning }),
      }),
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([{ isActive: true }]))
        .mockImplementation(() => chain([])),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    const result = await service.createTask(
      {
        title: 'Submit transcript',
        description: 'Upload the file',
        type: 'document_upload',
        dueDate: '2026-12-31',
        scholarId: 'scholar-1',
        phase: 'English',
      },
      'staff-1'
    );

    expect(result).toEqual(expect.objectContaining({ id: 'task-1', overdue: false }));
    const values = db.insert().values as jest.Mock;
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        scholarId: 'scholar-1',
        requiresAttachment: true,
        requiresResponse: false,
        requiresLink: false,
        phase: 'english',
        assignmentGroupId: null,
      })
    );
  });

  it('rejects task create from a non-staff user', async () => {
    (getDatabase as jest.Mock).mockReturnValue({
      select: jest.fn(() => chain([])),
      insert: jest.fn(),
    });

    await expect(
      service.createTask(
        {
          title: 'Spam',
          type: 'other',
          dueDate: '2026-10-01',
          scholarId: 'scholar-1',
        },
        'scholar-user'
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates a cohort of tasks for active prep-year scholars', async () => {
    const insertReturning = jest.fn().mockResolvedValue([
      { ...createdTask, assignmentGroupId: 'group-1' },
      { ...createdTask, id: 'task-2', assignmentGroupId: 'group-1' },
    ]);
    const db = {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({ returning: insertReturning }),
      }),
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([{ isActive: true }]))
        .mockImplementationOnce(() => chain([{ id: 'prep-1' }, { id: 'prep-2' }]))
        .mockImplementation(() => chain([])),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    const result = await service.createBulkTasks(
      {
        title: 'Orientation checklist',
        type: 'other',
        dueDate: '2026-10-01',
        programStage: 'prep_year',
      },
      'staff-1'
    );

    expect(result.created).toBe(2);
    const values = db.insert().values as jest.Mock;
    const rows = values.mock.calls[0][0] as Array<{ scholarId: string; assignmentGroupId: string }>;
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ scholarId: 'prep-1', requiresResponse: false }),
        expect.objectContaining({ scholarId: 'prep-2', requiresResponse: false }),
      ])
    );
    expect(rows[0].assignmentGroupId).toBe(rows[1].assignmentGroupId);
    expect(rows[0].assignmentGroupId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('rejects cohort assign when scholarIds are also sent', async () => {
    (getDatabase as jest.Mock).mockReturnValue({
      select: jest.fn(() => chain([{ isActive: true }])),
      insert: jest.fn(),
    });

    await expect(
      service.createBulkTasks(
        {
          title: 'Orientation checklist',
          type: 'other',
          dueDate: '2026-10-01',
          programStage: 'prep_year',
          scholarIds: ['confirmed-1'],
        },
        'staff-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects cohort assign when no matching scholars exist', async () => {
    (getDatabase as jest.Mock).mockReturnValue({
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([{ isActive: true }]))
        .mockImplementation(() => chain([])),
      insert: jest.fn(),
    });

    await expect(
      service.createBulkTasks(
        {
          title: 'Orientation checklist',
          type: 'other',
          dueDate: '2026-10-01',
          programStage: 'prep_year',
        },
        'staff-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('completes a complete-only task without evidence', async () => {
    const updatedTask = { ...createdTask, status: 'completed', requiresAttachment: false };
    const tx = {
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedTask]),
          }),
        }),
      }),
      select: jest.fn(() => chain([])),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'response-1' }]),
        }),
      }),
    };
    const db = {
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([{ id: 'scholar-1', userId: 'user-1' }]))
        .mockImplementationOnce(() =>
          chain([{ ...createdTask, requiresAttachment: false, scholarId: 'scholar-1' }])
        ),
      transaction: jest.fn(async (cb: (trx: typeof tx) => unknown) => cb(tx)),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    const result = await service.completeTask('task-1', {}, 'user-1');
    expect(result.task.status).toBe('completed');
    expect(objectStorage.headObject).not.toHaveBeenCalled();
  });

  it('rejects completion when required evidence is missing', async () => {
    const db = {
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([{ id: 'scholar-1', userId: 'user-1' }]))
        .mockImplementationOnce(() =>
          chain([
            {
              ...createdTask,
              requiresResponse: true,
              requiresAttachment: false,
              scholarId: 'scholar-1',
            },
          ])
        ),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    await expect(service.completeTask('task-1', {}, 'user-1')).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('rejects fake attachment payloads that have no S3 object', async () => {
    objectStorage.headObject.mockResolvedValue(null);
    const db = {
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([{ id: 'scholar-1', userId: 'user-1' }]))
        .mockImplementationOnce(() => chain([{ ...createdTask, scholarId: 'scholar-1' }])),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    await expect(
      service.completeTask(
        'task-1',
        {
          attachmentIds: [{ fileName: 'doc.pdf', fileKey: 'scholar-1/requests/temp/file.pdf' }],
        },
        'user-1'
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects scholar completion via status patch', async () => {
    const db = {
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([{ ...createdTask, requiresAttachment: false }]))
        .mockImplementationOnce(() => chain([]))
        .mockImplementationOnce(() => chain([{ id: 'scholar-1', userId: 'user-1' }])),
      update: jest.fn(),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    await expect(service.updateTaskStatus('task-1', 'completed', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(db.update).not.toHaveBeenCalled();
  });

  it('rejects status=completed when the task still needs evidence', async () => {
    const db = {
      select: jest
        .fn()
        .mockImplementationOnce(() => chain([createdTask]))
        .mockImplementationOnce(() => chain([{ isActive: true }])),
      update: jest.fn(),
      transaction: jest.fn(),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    await expect(service.updateTaskStatus('task-1', 'completed', 'staff-1')).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('clears evidence when reopening a completed task', async () => {
    const reopened = {
      ...createdTask,
      status: 'pending',
      completedAt: null,
      requiresAttachment: false,
    };
    const tx = {
      select: jest.fn().mockReturnValue(chain([{ id: 'response-1' }])),
      delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([reopened]),
          }),
        }),
      }),
    };
    const db = {
      select: jest
        .fn()
        .mockImplementationOnce(() =>
          chain([{ ...createdTask, status: 'completed', requiresAttachment: false }])
        )
        .mockImplementationOnce(() => chain([])) // not staff
        .mockImplementationOnce(() => chain([{ id: 'scholar-1', userId: 'user-1' }])),
      transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
    };
    (getDatabase as jest.Mock).mockReturnValue(db);

    const result = await service.updateTaskStatus('task-1', 'pending', 'user-1');
    expect(result.status).toBe('pending');
    expect(tx.delete).toHaveBeenCalledTimes(2);
  });

  it('rejects assignmentGroupId and columnKey together', async () => {
    await expect(
      service.getCohort({
        assignmentGroupId: '11111111-1111-4111-8111-111111111111',
        columnKey: 'indiv:english:Essay:2026-10-01',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('skips the tasks query when there are no prep_year scholars', async () => {
    const select = jest.fn(() => chain([]));
    (getDatabase as jest.Mock).mockReturnValue({ select });

    const result = await service.getCohort({});

    expect(select).toHaveBeenCalledTimes(1);
    expect(result.columns).toEqual([]);
    expect(result.scholars).toEqual([]);
    expect(result.summary.scholarCount).toBe(0);
  });
});
