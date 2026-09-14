import {
  buildPendingProposalFileKey,
  isPendingProposalFileKey,
  resolveProposalMimeType,
} from './proposal-files';

describe('proposal-files', () => {
  it('accepts pdf and word files', () => {
    expect(resolveProposalMimeType('work.pdf', 'application/pdf')).toBe('application/pdf');
    expect(resolveProposalMimeType('work.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('rejects other types', () => {
    expect(resolveProposalMimeType('notes.txt')).toBeNull();
  });

  it('scopes pending keys to the scholar', () => {
    const key = buildPendingProposalFileKey('scholar-1', 'upload-1', 'Topic.docx');
    expect(isPendingProposalFileKey(key, 'scholar-1')).toBe(true);
    expect(isPendingProposalFileKey(key, 'scholar-2')).toBe(false);
  });
});
