import { sqlFragmentText } from '../scholars/platform-setup';
import { taskProgressFilterSql } from './task-progress-filter';

describe('taskProgressFilterSql', () => {
  it('requires incomplete tasks and UTC overdue dates', () => {
    const text = sqlFragmentText(taskProgressFilterSql('overdue'));
    expect(text).toContain("t.status <> 'completed'");
    expect(text).toContain('t.deleted_at IS NULL');
    expect(text).toContain('< (CURRENT_TIMESTAMP AT TIME ZONE');
    expect(text).not.toContain('program_stage');
    expect(text).not.toContain("= 'completed'");
  });

  it('uses equality for due today and inequality for behind', () => {
    const dueToday = sqlFragmentText(taskProgressFilterSql('due_today'));
    const behind = sqlFragmentText(taskProgressFilterSql('behind'));
    expect(dueToday).toContain('= (CURRENT_TIMESTAMP AT TIME ZONE');
    expect(behind).toContain('<= (CURRENT_TIMESTAMP AT TIME ZONE');
    expect(dueToday).toContain("t.status <> 'completed'");
    expect(behind).toContain("t.status <> 'completed'");
  });
});
