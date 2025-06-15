import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export default function QRCodeDisplay({ url, size = 256 }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <QRCodeSVG
          value={url}
          size={size}
          level="H"
          includeMargin
          className="rounded-lg"
        />
      </div>
      <p className="mt-4 text-sm text-gray-600 break-all text-center max-w-xs">
        {url}
      </p>
    </div>
  );
} 