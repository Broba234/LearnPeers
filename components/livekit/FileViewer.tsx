'use client';

import React from 'react';

export function FileViewer({
  file,
  onClose,
}: {
  file: { url: string; name: string; type: string };
  onClose?: () => void;
}) {
  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const [imageStatus, setImageStatus] = React.useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    setImageStatus('loading');
    setRetryCount(0);
  }, [file.url]);

  return (
    <div className="w-full h-full relative flex items-center justify-center bg-gray-700">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close file view"
          title="Close file view"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
      {isImage ? (
        <>
          {imageStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              <span className="ml-3 text-white text-sm">Loading image...</span>
            </div>
          )}
          {imageStatus === 'error' && (
            <div className="text-center text-white">
              <p className="text-lg font-semibold mb-2">Failed to load image</p>
              <p className="text-gray-300 text-sm mb-4">{file.name}</p>
              {retryCount < 3 && (
                <button
                  onClick={() => {
                    setRetryCount((c) => c + 1);
                    setImageStatus('loading');
                  }}
                  className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 mr-2"
                >
                  Retry
                </button>
              )}
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 inline-block"
              >
                Open in new tab
              </a>
            </div>
          )}
          <img
            src={retryCount > 0 ? `${file.url}${file.url.includes('?') ? '&' : '?'}retry=${retryCount}` : file.url}
            alt={file.name}
            crossOrigin="anonymous"
            className={`max-w-full max-h-full object-contain ${imageStatus !== 'loaded' ? 'hidden' : ''}`}
            onLoad={() => setImageStatus('loaded')}
            onError={() => setImageStatus('error')}
          />
        </>
      ) : isPdf ? (
        <iframe
          src={file.url}
          title={file.name}
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      ) : (
        <div className="text-center text-white">
          <h3 className="text-2xl font-bold">{file.name}</h3>
          <p className="text-gray-300 mt-2">
            File type not supported for preview
          </p>
          <a
            href={file.url}
            download={file.name}
            className="text-brand-300 hover:underline mt-4 inline-block"
          >
            Download File
          </a>
        </div>
      )}
    </div>
  );
}
