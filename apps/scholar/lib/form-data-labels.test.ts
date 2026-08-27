import { getFormDataDisplayItems } from '@workspace/ui/lib/form-data-labels';

describe('getFormDataDisplayItems unmapped values', () => {
  it('joins arrays and stringifies objects instead of [object Object]', () => {
    const items = getFormDataDisplayItems('extenuating_circumstances', {
      tags: ['urgent', 'visa'],
      extra: { note: 'follow up' },
    });

    expect(items).toEqual(
      expect.arrayContaining([
        { label: 'Tags', value: 'urgent, visa' },
        { label: 'Extra', value: '{"note":"follow up"}' },
      ])
    );
    expect(items.some((item) => item.value.includes('[object Object]'))).toBe(false);
  });
});
