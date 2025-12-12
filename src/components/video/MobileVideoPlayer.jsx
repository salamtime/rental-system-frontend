import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Download, 
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { 
  generateVideoSources, 
  formatDuration, 
  getNetworkQuality,
  configureMobileVideo,
  enterMobileFullscreen,
  exitMobileFullscreen,
  isMobileDevice,
  isIOSSafari,
  needsConversion,
  getVideoFormat
} from '../../utils/videoUtils';

const MobileVideoPlayer = ({ 
  src, 
  poster, 
  title = "Video Player",
  onClose,
  className = "",
  autoPlay = false,
  controls = true,
  onError,
  onLoadSuccess
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  
  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState(null);
  
  // Mobile specific state
  const [isMobile] = useState(isMobileDevice());
  const [networkQuality, setNetworkQuality] = useState(getNetworkQuality());
  const [retryCount, setRetryCount] = useState(0);
  const [videoSources, setVideoSources] = useState([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [urlValidation, setUrlValidation] = useState({ isValid: false, checked: false });

  // Validate video URL
  const validateVideoUrl = useCallback(async (url) => {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'Invalid video URL' };
    }

    try {
      // Check if URL is accessible
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        return { 
          isValid: false, 
          error: `Video not accessible (${response.status}: ${response.statusText})` 
        };
      }

      // Check content type
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.startsWith('video/')) {
        return { 
          isValid: false, 
          error: `Invalid content type: ${contentType}` 
        };
      }

      return { isValid: true, error: null };
    } catch (error) {
      console.error('URL validation failed:', error);
      return { 
        isValid: false, 
        error: `Network error: ${error.message}` 
      };
    }
  }, []);

  // Initialize video sources with validation
  useEffect(() => {
    if (src) {
      const initializeVideo = async () => {
        setLoading(true);
        setError(null);
        
        // Validate primary URL
        const validation = await validateVideoUrl(src);
        setUrlValidation(validation);
        
        if (!validation.isValid) {
          setError(`Video URL validation failed: ${validation.error}`);
          setLoading(false);
          return;
        }

        const sources = generateVideoSources(src);
        setVideoSources(sources);
        setCurrentSourceIndex(0);
        setRetryCount(0);
      };

      initializeVideo();
    }
  }, [src, validateVideoUrl]);

  // Configure video element for mobile
  useEffect(() => {
    if (videoRef.current) {
      configureMobileVideo(videoRef.current);
    }
  }, []);

  // Monitor network quality
  useEffect(() => {
    const handleOnline = () => {
      setNetworkQuality('fast');
      // Retry loading if we were offline
      if (error && error.includes('Network')) {
        handleRetry();
      }
    };
    const handleOffline = () => setNetworkQuality('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error]);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (!isMobile || !showControls) return;
    
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    
    setControlsTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [showControls, isPlaying, isMobile]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Video event handlers with enhanced error handling
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setLoading(false);
      setError(null); // Clear any previous errors
      
      console.log('✅ Video loaded successfully:', {
        duration: videoRef.current.duration,
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
        src: videoRef.current.currentSrc
      });
      
      if (onLoadSuccess) {
        onLoadSuccess({
          duration: videoRef.current.duration,
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        });
      }
    }
  }, [onLoadSuccess]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Update buffered progress
      try {
        const bufferedEnd = videoRef.current.buffered.length > 0 
          ? videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
          : 0;
        setBuffered(bufferedEnd);
      } catch (err) {
        // Ignore buffered errors
      }
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setError(null); // Clear errors on successful play
  }, []);
  
  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleError = useCallback((e) => {
    console.error('❌ Video error:', {
      error: e,
      currentSrc: videoRef.current?.currentSrc,
      networkState: videoRef.current?.networkState,
      readyState: videoRef.current?.readyState,
      currentSourceIndex,
      totalSources: videoSources.length
    });
    
    // Try next source if available
    if (currentSourceIndex < videoSources.length - 1) {
      console.log(`🔄 Trying next source (${currentSourceIndex + 1}/${videoSources.length})`);
      setCurrentSourceIndex(prev => prev + 1);
      setError(null);
      setLoading(true);
      return;
    }
    
    // All sources failed, determine error message
    let errorMessage = 'Failed to load video. Please check your connection and try again.';
    
    if (networkQuality === 'offline') {
      errorMessage = 'You appear to be offline. Please check your internet connection.';
    } else if (needsConversion(src)) {
      errorMessage = isIOSSafari() 
        ? 'Video format not supported on iOS Safari. MP4 format required.'
        : 'Video format not supported on this browser. Please try a different format.';
    } else if (!urlValidation.isValid) {
      errorMessage = `Video access error: ${urlValidation.error}`;
    } else if (videoRef.current?.networkState === 3) { // NETWORK_NO_SOURCE
      errorMessage = 'Video source not found. The file may have been moved or deleted.';
    } else if (videoRef.current?.error) {
      const mediaError = videoRef.current.error;
      switch (mediaError.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = 'Video loading was aborted.';
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = 'Network error occurred while loading video.';
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMessage = 'Video format is corrupted or not supported.';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = 'Video format or source is not supported.';
          break;
        default:
          errorMessage = `Video error (code ${mediaError.code}): ${mediaError.message}`;
      }
    }
    
    setError(errorMessage);
    setLoading(false);
    
    if (onError) {
      onError(new Error(errorMessage));
    }
  }, [currentSourceIndex, videoSources.length, src, onError, networkQuality, urlValidation]);

  const handleWaiting = useCallback(() => {
    setLoading(true);
    console.log('📡 Video buffering...');
  }, []);
  
  const handleCanPlay = useCallback(() => {
    setLoading(false);
    console.log('✅ Video can play');
  }, []);

  const handleLoadStart = useCallback(() => {
    console.log('🔄 Video load started');
    setLoading(true);
  }, []);

  const handleProgress = useCallback(() => {
    // Handle loading progress
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBuffered(bufferedEnd);
    }
  }, []);

  // Control handlers
  const togglePlayPause = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Play/pause failed:', error);
      setError('Playback failed. Please try again.');
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVolume) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  }, []);

  const handleSeek = useCallback((e) => {
    if (!videoRef.current || !duration || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    
    videoRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
  }, [duration]);

  const handleRestart = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (!isPlaying) {
        togglePlayPause();
      }
    }
  }, [isPlaying, togglePlayPause]);

  const toggleFullscreen = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      if (isFullscreen) {
        await exitMobileFullscreen();
      } else {
        await enterMobileFullscreen(videoRef.current);
      }
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  }, [isFullscreen]);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = src;
    link.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.' + getVideoFormat(src);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src, title]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      setError('Maximum retry attempts reached. Please try downloading the video or contact support.');
      return;
    }

    console.log(`🔄 Retrying video load (attempt ${retryCount + 1}/3)`);
    
    setError(null);
    setLoading(true);
    setRetryCount(prev => prev + 1);
    setCurrentSourceIndex(0);
    
    // Re-validate URL if needed
    if (!urlValidation.isValid) {
      const validation = await validateVideoUrl(src);
      setUrlValidation(validation);
      
      if (!validation.isValid) {
        setError(`URL validation failed: ${validation.error}`);
        setLoading(false);
        return;
      }
    }
    
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [retryCount, urlValidation, validateVideoUrl, src]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleClick = useCallback(() => {
    if (isMobile) {
      showControlsTemporarily();
    } else {
      togglePlayPause();
    }
  }, [isMobile, showControlsTemporarily, togglePlayPause]);

  // Render error state
  if (error) {
    return (
      <div className={`mobile-video-player error-state ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Playback Error</h3>
          <p className="text-gray-600 mb-4 max-w-md text-sm">{error}</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {retryCount < 3 && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry ({retryCount}/3)
              </button>
            )}
            
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-500 space-y-1">
            <p>Format: {getVideoFormat(src).toUpperCase()}</p>
            <p>Network: {networkQuality === 'offline' ? 'Offline' : 'Online'}</p>
            <p>Device: {isMobile ? 'Mobile' : 'Desktop'}</p>
            {urlValidation.checked && (
              <p>URL Status: {urlValidation.isValid ? 'Valid' : 'Invalid'}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`mobile-video-player relative bg-black rounded-lg overflow-hidden ${className} ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-auto max-h-full object-contain"
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        onLoadStart={handleLoadStart}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onProgress={handleProgress}
        onVolumeChange={() => {
          if (videoRef.current) {
            setVolume(videoRef.current.volume);
            setIsMuted(videoRef.current.muted);
          }
        }}
      >
        {videoSources.length > 0 && (
          <source 
            src={videoSources[currentSourceIndex]?.src} 
            type={videoSources[currentSourceIndex]?.type}
          />
        )}
        Your browser does not support the video tag.
      </video>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-sm">Loading video...</p>
            {networkQuality === 'slow' && (
              <p className="text-xs text-gray-300 mt-2">Slow connection detected</p>
            )}
            {currentSourceIndex > 0 && (
              <p className="text-xs text-gray-300 mt-1">
                Trying source {currentSourceIndex + 1}/{videoSources.length}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Network Status */}
      {networkQuality === 'offline' && (
        <div className="absolute top-4 left-4 flex items-center bg-red-600 text-white px-3 py-1 rounded-full text-sm">
          <WifiOff className="w-4 h-4 mr-2" />
          Offline
        </div>
      )}

      {/* Custom Controls */}
      {controls && !loading && (
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              <h3 className="text-lg font-semibold truncate flex-1">{title}</h3>
              {onClose && (
                <button
                  onClick={onClose}
                  className="ml-4 p-2 rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-all"
                >
                  <Minimize className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Video Info */}
            <div className="mt-2 text-xs text-gray-300 flex items-center space-x-4">
              <span>Format: {getVideoFormat(src).toUpperCase()}</span>
              <span>Duration: {formatDuration(duration)}</span>
              {networkQuality !== 'fast' && (
                <div className="flex items-center">
                  <Wifi className="w-3 h-3 mr-1" />
                  <span>{networkQuality}</span>
                </div>
              )}
            </div>
          </div>

          {/* Center Play Button */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlayPause}
                className="bg-white bg-opacity-90 rounded-full p-4 hover:bg-opacity-100 transition-all shadow-lg"
              >
                <Play className="w-8 h-8 text-gray-800 ml-1" />
              </button>
            </div>
          )}

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            {/* Progress Bar */}
            <div 
              ref={progressRef}
              className="w-full h-2 bg-gray-600 rounded-full mb-4 cursor-pointer relative"
              onClick={handleSeek}
            >
              {/* Buffered Progress */}
              <div 
                className="absolute h-full bg-gray-400 rounded-full"
                style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
              />
              
              {/* Current Progress */}
              <div 
                className="absolute h-full bg-blue-500 rounded-full transition-all duration-150"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
              
              {/* Progress Handle */}
              <div 
                className="absolute w-4 h-4 bg-blue-500 rounded-full -mt-1 transition-all duration-150"
                style={{ 
                  left: duration ? `calc(${(currentTime / duration) * 100}% - 8px)` : '0%' 
                }}
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-4">
                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                {/* Restart */}
                <button
                  onClick={handleRestart}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                {/* Volume Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  
                  {!isMobile && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                  )}
                </div>

                {/* Time Display */}
                <span className="text-sm font-mono">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Download */}
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                >
                  <Download className="w-5 h-5" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileVideoPlayer;