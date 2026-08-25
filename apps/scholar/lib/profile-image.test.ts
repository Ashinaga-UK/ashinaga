import { fileToProfileImageDataUrl } from '@workspace/ui/lib/profile-image';

describe('fileToProfileImageDataUrl', () => {
  it('rejects non-image files', async () => {
    const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' });
    await expect(fileToProfileImageDataUrl(file)).rejects.toThrow(
      'Please choose an image file.'
    );
  });

  it('rejects source files larger than 25MB', async () => {
    const file = { type: 'image/png', size: 25 * 1024 * 1024 + 1 } as File;
    await expect(fileToProfileImageDataUrl(file)).rejects.toThrow(
      'Please choose an image smaller than 25MB.'
    );
  });
});
