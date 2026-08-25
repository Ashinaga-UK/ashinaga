import { fileToProfileImageDataUrl } from '@workspace/ui/lib/profile-image';

describe('fileToProfileImageDataUrl', () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap;
    jest.restoreAllMocks();
  });

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

  it('decodes with createImageBitmap so EXIF orientation is applied', async () => {
    const close = jest.fn();
    const bitmap = { width: 100, height: 200, close } as unknown as ImageBitmap;
    const createImageBitmapMock = jest.fn().mockResolvedValue(bitmap);
    globalThis.createImageBitmap = createImageBitmapMock;

    const toDataURL = jest.fn().mockReturnValue('data:image/jpeg;base64,abc');
    const drawImage = jest.fn();
    const fillRect = jest.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn().mockReturnValue({
        fillStyle: '',
        fillRect,
        drawImage,
      }),
      toDataURL,
    } as unknown as HTMLCanvasElement;
    const createElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return canvas;
      return createElement(tagName);
    });

    const file = new File(['fake-jpeg'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await fileToProfileImageDataUrl(file);

    expect(createImageBitmapMock).toHaveBeenCalledWith(file, {
      imageOrientation: 'from-image',
    });
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 100, 200);
    expect(result).toBe('data:image/jpeg;base64,abc');
    expect(close).toHaveBeenCalled();
  });
});
