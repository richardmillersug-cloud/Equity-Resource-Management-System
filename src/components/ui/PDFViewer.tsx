'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize, 
  Minimize, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Printer,
  Share2,
  AlertCircle
} from 'lucide-react';

interface PDFViewerProps {
  documentUrl: string;
  documentName: string;
  onClose?: () => void;
  showControls?: boolean;
  className?: string;
}

export default function PDFViewer({ 
  documentUrl, 
  documentName, 
  onClose, 
  showControls = true, 
  className = "" 
}: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle fullscreen change
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const toggleFullscreen = async () => {
    if (!viewerRef.current) return;

    try {
      if (!isFullscreen) {
        await viewerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = documentName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    } else {
      // Fallback: open in new window for printing
      const printWindow = window.open(documentUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: documentName,
          text: `View document: ${documentName}`,
          url: documentUrl
        });
      } catch (err) {
        console.error('Share error:', err);
        // Fallback to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      // Check if clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(documentUrl);
        alert('Document URL copied to clipboard!');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = documentUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        alert('Document URL copied to clipboard!');
      }
    } catch (err) {
      console.error('Clipboard error:', err);
      alert('Copy functionality not supported in this browser. Please copy manually: ' + documentUrl);
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load PDF document. Please try downloading it instead.');
  };

  return (
    <div 
      ref={viewerRef}
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      } ${className}`}
    >
      {/* Header with Controls */}
      {showControls && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Eye className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 truncate max-w-md">
                  {documentName}
                </h3>
              </div>
              {loading && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 bg-white rounded-lg border border-gray-300 px-2 py-1">
                <button
                  onClick={handleZoomOut}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm text-gray-600 min-w-[50px] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Rotate"
              >
                <RotateCw className="h-4 w-4 text-gray-600" />
              </button>

              <button
                onClick={handlePrint}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Print"
              >
                <Printer className="h-4 w-4 text-gray-600" />
              </button>

              <button
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Share"
              >
                <Share2 className="h-4 w-4 text-gray-600" />
              </button>

              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 rounded-lg bg-blue-50 text-blue-600"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4 text-gray-600" />
                ) : (
                  <Maximize className="h-4 w-4 text-gray-600" />
                )}
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg text-red-600"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PDF Content */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Display PDF</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
              >
                <Download className="h-4 w-4" />
                Download Document
              </button>
            </div>
          </div>
        )}

        {/* PDF Iframe */}
        <iframe
          ref={iframeRef}
          src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=${zoom}&rotation=${rotation}`}
          className={`w-full border-0 transition-all duration-200 ${
            isFullscreen ? 'h-screen' : 'h-96 md:h-[600px]'
          }`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center'
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={documentName}
        />
      </div>

      {/* Footer with Navigation (if applicable) */}
      {showControls && !loading && !error && (
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <div className="text-sm text-gray-500">
              {documentName.split('.').pop()?.toUpperCase()} Document
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Standalone PDF Viewer Modal Component
interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
}

export function PDFViewerModal({ isOpen, onClose, documentUrl, documentName }: PDFViewerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
        <PDFViewer
          documentUrl={documentUrl}
          documentName={documentName}
          onClose={onClose}
          showControls={true}
          className="h-full"
        />
      </div>
    </div>
  );
}

// Embedded PDF Preview Component
interface PDFPreviewProps {
  documentUrl: string;
  documentName: string;
  onClick?: () => void;
  height?: string;
}

export function PDFPreview({ documentUrl, documentName, onClick, height = "h-48" }: PDFPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div 
      className={`${height} border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative group`}
      onClick={onClick}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">PDF Preview</p>
          </div>
        </div>
      )}

      <iframe
        src={`${documentUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=75`}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        title={documentName}
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Eye className="h-8 w-8 text-white drop-shadow-lg" />
        </div>
      </div>
    </div>
  );
} 