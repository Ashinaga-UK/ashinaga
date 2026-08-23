import { fileToProfileImageDataUrl } from '@workspace/ui/lib/profile-image';

describe('fileToProfileImageDataUrl', () => {
  it('rejects non-image files', async () => {
    const file = new File(['not-an-image'], 'notes.txt', { type: 'text/plain' });
    await expect(fileToProfileImageDataUrl(file)).rejects.toThrow(
      'Please choose an image file.'
    );
  });

  it('rejects files larger than 2MB', async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'photo.png', {
      type: 'image/png',
    });
    await expect(fileToProfileImageDataUrl(file)).rejects.toThrow(
      'Please choose an image smaller than 2MB.'
    );
  });
});
