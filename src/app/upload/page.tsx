'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';
import { compressImage, storeImage } from '@/utils/imageUtils';

export default function UploadPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleImageCapture = async (imageData: string) => {
    setIsLoading(true);
    try {
      const compressedImage = await compressImage(imageData);
      const billId = await storeImage(compressedImage);
      router.push(`/bill/${billId}/review`);
    } catch (error) {
      console.error('Error processing image:', error);
      // TODO: Add error handling UI
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload a Bill</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white shadow rounded-lg p-6 col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload from Gallery</h2>
          <FileUpload onUpload={handleImageCapture} />
        </div>
      </div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="text-gray-900">Processing image...</p>
          </div>
        </div>
      )}
    </div>
  );
} 