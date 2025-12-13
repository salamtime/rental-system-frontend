import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, Info, RotateCcw } from 'lucide-react';
import MobileVideoPlayer from './MobileVideoPlayer';
import { isMobileDevice, formatFileSize } from '../../utils/videoUtils';

const VideoModal = ({ 
  isOpen, 
  onClose, 
  videoSrc, 
  title = "Video Player",
  description = "",
  metadata = {},
  onRetry
}) => {
  const modalRef = useRef(null);
  const [isMobile] = useState(isMobileDevice());
  const [orientation, setOrientation] = useState('portrait');
  const [showInfo, setShowInfo] = useState(false);

  // Handle orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      setOrientation(isLandscape ? 'landscape' : 'portrait');
    };

    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Handle modal open/close effects
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Set viewport for mobile
      if (isMobile) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
      }
      
      // Focus management
      if (modalRef.current) {
        modalRef.current.focus();
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isMobile]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case ' ':
          e.preventDefault();
          // Space key handled by video player
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Share functionality
  const handleShare = async () => {
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: videoSrc
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log('Error sharing:', err);
          fallbackShare();
        }
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(videoSrc).then(() => {
        alert('Video link copied to clipboard!');
      }).catch(() => {
        manualCopyFallback();
      });
    } else {
      manualCopyFallback();
    }
  };

  const manualCopyFallback = () => {
    const textArea = document.createElement('textarea');
    textArea.value = videoSrc;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      alert('Video link copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Unable to copy link. Please copy manually: ' + videoSrc);
    }
    
    document.body.removeChild(textArea);
  };

  // Download functionality
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoSrc;
    link.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.webm';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-95"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
    >
      <div 
        ref={modalRef}
        className={`relative h-full flex flex-col ${
          isMobile 
            ? 'p-0' 
            : 'p-4'
        }`}
        tabIndex={-1}
      >
        {/* Header - Desktop Only */}
        {!isMobile && (
          <div className="flex items-center justify-between text-white mb-4 z-10">
            <div className="flex-1 min-w-0 mr-4">
              <h2 id="video-modal-title" className="text-xl font-semibold truncate">
                {title}
              </h2>
              {description && (
                <p className="text-gray-300 text-sm truncate mt-1">
                  {description}
                </p>
              )}
            </div>
            
            {/* Desktop Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                title="Video information"
                aria-label="Toggle video information"
              >
                <Info className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                title="Share video"
                aria-label="Share video"
              >
                <Share2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleDownload}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                title="Download video"
                aria-label="Download video"
              >
                <Download className="w-5 h-5" />
              </button>
              
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                  title="Retry loading"
                  aria-label="Retry loading video"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                title="Close"
                aria-label="Close video modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Video Container */}
        <div className={`flex-1 flex items-center justify-center ${
          isMobile && orientation === 'landscape' ? 'h-full' : ''
        }`}>
          <div className={`w-full ${
            isMobile 
              ? 'h-full' 
              : 'max-w-6xl max-h-full'
          }`}>
            <MobileVideoPlayer
              src={videoSrc}
              title={title}
              onClose={isMobile ? onClose : null}
              className={`${
                isMobile 
                  ? 'h-full rounded-none' 
                  : 'max-h-[80vh] rounded-lg'
              }`}
              autoPlay={false}
              controls={true}
              onError={(error) => {
                console.error('Video playback error:', error);
              }}
              onLoadSuccess={(metadata) => {
                console.log('Video loaded successfully:', metadata);
              }}
            />
          </div>
        </div>

        {/* Desktop Info Panel */}
        {!isMobile && showInfo && Object.keys(metadata).length > 0 && (
          <div className="mt-4 bg-black bg-opacity-50 rounded-lg p-4 text-white">
            <div className="flex items-center mb-3">
              <Info className="w-4 h-4 mr-2" />
              <span className="font-medium">Video Information</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key}>
                  <span className="text-gray-400 capitalize block">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <div className="font-medium text-white">
                    {key.includes('size') && typeof value === 'number' 
                      ? formatFileSize(value)
                      : value
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mobile Action Bar */}
        {isMobile && orientation === 'portrait' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
            <div className="flex justify-center space-x-8">
              <ActionButton
                onClick={handleShare}
                icon={Share2}
                label="Share"
              />
              
              <ActionButton
                onClick={handleDownload}
                icon={Download}
                label="Download"
              />
              
              {Object.keys(metadata).length > 0 && (
                <ActionButton
                  onClick={() => {
                    const metadataText = Object.entries(metadata)
                      .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
                      .join('\n');
                    alert(`Video Information:\n\n${metadataText}`);
                  }}
                  icon={Info}
                  label="Info"
                />
              )}
              
              {onRetry && (
                <ActionButton
                  onClick={onRetry}
                  icon={RotateCcw}
                  label="Retry"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile Action Button Component
const ActionButton = ({ onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center text-white min-w-0"
  >
    <div className="p-3 rounded-full bg-white bg-opacity-20 mb-1 hover:bg-opacity-30 transition-all">
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-xs font-medium truncate">{label}</span>
  </button>
);

export default VideoModal;