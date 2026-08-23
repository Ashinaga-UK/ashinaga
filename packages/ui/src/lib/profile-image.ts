export const PROFILE_IMAGE_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_DIMENSION = 800;
export const PROFILE_IMAGE_JPEG_QUALITY = 0.85;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error('Could not read that image. Please try another file.'));
    reader.readAsDataURL(file);
  });
}

function compressAsJpeg(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const longestSide = Math.max(image.width, image.height) || 1;
      const scale =
        longestSide > PROFILE_IMAGE_MAX_DIMENSION
          ? PROFILE_IMAGE_MAX_DIMENSION / longestSide
          : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Could not process that image. Please try another file.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', PROFILE_IMAGE_JPEG_QUALITY));
    };
    image.onerror = () =>
      reject(new Error('Could not process that image. Please try another file.'));
    image.src = dataUrl;
  });
}

export async function fileToProfileImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  if (file.size > PROFILE_IMAGE_MAX_FILE_BYTES) {
    throw new Error('Please choose an image smaller than 2MB.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  return compressAsJpeg(dataUrl);
}
