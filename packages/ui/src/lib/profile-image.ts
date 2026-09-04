/** Loose sanity bound on the *source* file. The real limit is applied to the compressed output. */
export const PROFILE_IMAGE_MAX_SOURCE_BYTES = 25 * 1024 * 1024;
/** Legacy data-URL length bound (kept for any remaining preview helpers). */
export const PROFILE_IMAGE_MAX_DATA_URL_LENGTH = 3_000_000;
/** Max compressed JPEG size uploaded to S3 (keep in sync with AVATAR_FILE_MAX_SIZE_BYTES). */
export const PROFILE_IMAGE_MAX_BLOB_BYTES = 1 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_DIMENSION = 800;
export const PROFILE_IMAGE_JPEG_QUALITY = 0.85;
export const PROFILE_IMAGE_CONTENT_TYPE = 'image/jpeg';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error('Could not read that image. Please try another file.'));
    reader.readAsDataURL(file);
  });
}

function loadHtmlImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('Could not process that image. Please try another file.'));
    image.src = dataUrl;
  });
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function decodeOrientedImage(file: File): Promise<DecodedImage> {
  // Prefer createImageBitmap so EXIF orientation (phone portraits) is applied
  // before we re-encode to JPEG. HTMLImageElement is inconsistent across browsers.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to HTMLImageElement (older Safari, jsdom, decode failures).
    }
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadHtmlImage(dataUrl);
  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    close: () => undefined,
  };
}

function compressToJpegDataUrl(decoded: DecodedImage): string {
  const longestSide = Math.max(decoded.width, decoded.height) || 1;
  const scale =
    longestSide > PROFILE_IMAGE_MAX_DIMENSION ? PROFILE_IMAGE_MAX_DIMENSION / longestSide : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(decoded.width * scale));
  canvas.height = Math.max(1, Math.round(decoded.height * scale));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not process that image. Please try another file.');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', PROFILE_IMAGE_JPEG_QUALITY);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Could not process that image. Please try another file.');
  }
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: match[1] || PROFILE_IMAGE_CONTENT_TYPE });
}

async function compressFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  if (file.size > PROFILE_IMAGE_MAX_SOURCE_BYTES) {
    throw new Error('Please choose an image smaller than 25MB.');
  }

  const decoded = await decodeOrientedImage(file);
  try {
    return compressToJpegDataUrl(decoded);
  } finally {
    decoded.close();
  }
}

/** @deprecated Prefer fileToProfileImageBlob for uploads. Still useful for local previews. */
export async function fileToProfileImageDataUrl(file: File): Promise<string> {
  const compressed = await compressFile(file);
  if (compressed.length > PROFILE_IMAGE_MAX_DATA_URL_LENGTH) {
    throw new Error('That image is too large to save. Please try a smaller one.');
  }
  return compressed;
}

export async function fileToProfileImageBlob(file: File): Promise<Blob> {
  const compressed = await compressFile(file);
  const blob = dataUrlToBlob(compressed);
  if (blob.size > PROFILE_IMAGE_MAX_BLOB_BYTES) {
    throw new Error('That image is too large to save. Please try a smaller one.');
  }
  return blob;
}
