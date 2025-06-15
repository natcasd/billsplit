import { v4 as uuidv4 } from 'uuid';

export const compressImage = (imageData: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1200;
      const MAX_HEIGHT = 1200;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = imageData;
  });
};

export const storeImage = async (imageData: string): Promise<string> => {
  const billId = uuidv4();
  if (typeof window !== 'undefined') {
    try {
      const compressedImage = await compressImage(imageData);
      try {
        localStorage.setItem(`bill_image_${billId}`, compressedImage);
      } catch (error) {
        // If storage is full, try to clean up old images
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          // Get all bill image keys
          const keys = Object.keys(localStorage).filter(key => key.startsWith('bill_image_'));
          // Sort by timestamp (assuming keys are in format bill_image_timestamp_uuid)
          keys.sort();
          // Remove oldest images until we have space
          while (keys.length > 0) {
            localStorage.removeItem(keys.shift()!);
            try {
              localStorage.setItem(`bill_image_${billId}`, compressedImage);
              break; // Successfully stored the new image
            } catch (e) {
              // Continue removing if still no space
              continue;
            }
          }
        } else {
          throw error; // Re-throw if it's not a quota error
        }
      }
    } catch (error) {
      console.error('Failed to store image:', error);
      // If compression fails, try storing the original image
      try {
        localStorage.setItem(`bill_image_${billId}`, imageData);
      } catch (error) {
        console.error('Failed to store original image:', error);
      }
    }
  }
  return billId;
}; 