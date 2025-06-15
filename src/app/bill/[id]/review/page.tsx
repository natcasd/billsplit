'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Bill } from '@/types';
import BillReview from '@/components/BillReview';

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [bill, setBill] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);

  useEffect(() => {
    const analyzeReceipt = async () => {
      try {
        // Get the stored image from localStorage
        const storedImage = localStorage.getItem(`bill_image_${params.id}`);
        if (!storedImage) {
          throw new Error('No receipt image found');
        }
        setImageData(storedImage);
        // Convert base64 to blob
        const base64Data = storedImage.split(',')[1];
        const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(res => res.blob());

        // Create FormData and append image
        const formData = new FormData();
        formData.append('image', blob, 'receipt.jpg');

        // Send to API
        const response = await fetch('/api/analyze-receipt', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to analyze receipt');
        }

        const data = await response.json();
        setBill(data);
        // Store the bill as JSON for later use
        localStorage.setItem(`bill_${params.id}`, JSON.stringify(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      analyzeReceipt();
    }
  }, [params.id]);

  const handleSave = async (updatedBill: Bill) => {
    try {
      // Create a new session with the bill data
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bill: updatedBill }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const { sessionId } = await response.json();
      router.push(`/bill/${sessionId}/share`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bill');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analyzing receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/upload')}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!bill) {
    return null;
  }

  if (!bill.isReceipt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Not a valid receipt</h1>
          <p className="mb-4">The uploaded image was not recognized as a valid receipt. Please try again.</p>
          <button
            onClick={() => router.push('/upload')}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
          >
            Retake Photo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Review Bill</h1>
      {imageData && (
        <div className="mb-8 flex justify-center">
          <img src={imageData} alt="Receipt" className="max-h-96 rounded shadow" />
        </div>
      )}
      <BillReview initialBill={bill} onSave={handleSave} showRetakeButton />
    </div>
  );
} 