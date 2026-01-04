import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Video, 
  Play, 
  Download, 
  Calendar, 
  Clock, 
  FileVideo, 
  X,
  Loader2,
  AlertTriangle,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';

const RentalVideos = ({ rental, onUpdate }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [thumbnailStates, setThumbnailStates] = useState({});
  const [downloadingStates, setDownloadingStates] = useState({});
  const [retryCount, setRetryCount] = useState(0);
  const [videoRetryCount, setVideoRetryCount] = useState(0);

  // Load videos for the rental with enhanced error handling
  useEffect(() => {
    if (!rental?.id) {
      setLoading(false);
      return;
    }

    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📹 Loading videos for rental:', rental.id);

        const { data: mediaRecords, error: mediaError } = await supabase
          .from('app_2f7bf469b0_rental_media')
          .select('*')
          .eq('rental_id', rental.id)
          .ilike('file_type', 'video%')
          .order('created_at', { ascending: false });

        if (mediaError) {
          console.error('Database error:', mediaError);
          throw new Error(`Failed to load videos: ${mediaError.message}`);
        }

        if (mediaRecords && mediaRecords.length > 0) {
          const videoItems = mediaRecords.map(record => ({
            id: record.id,
            type: 'video',
            url: record.public_url,
            thumbnailUrl: record.poster_url,
            duration: record.duration || 0,
            timestamp: record.created_at,
            original_filename: record.original_filename,
            file_size: record.file_size,
            phase: record.phase,
            poster_url: record.poster_url,
            storage_path: record.storage_path,
            isUrlValid: !!record.public_url
          }));

          console.log('📹 Videos loaded:', videoItems.length);
          setVideos(videoItems);
        } else {
          setVideos([]);
        }
      } catch (err) {
        console.error('Error loading videos:', err);
        setError(`Failed to load videos: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [rental?.id, retryCount]);

  // Generate thumbnail from video with enhanced error handling
  const generateThumbnailFromVideo = async (videoUrl, videoId) => {
    return new Promise((resolve) => {
      try {
        setThumbnailStates(prev => ({ ...prev, [videoId]: 'generating' }));
        
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas context not available');
        }
        
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.playsInline = true;
        
        const timeout = setTimeout(() => {
          console.warn('Thumbnail generation timeout for:', videoId);
          setThumbnailStates(prev => ({ ...prev, [videoId]: 'error' }));
          resolve(null);
        }, 10000);
        
        video.onloadedmetadata = () => {
          try {
            clearTimeout(timeout);
            
            const aspectRatio = video.videoWidth / video.videoHeight;
            canvas.width = 320;
            canvas.height = 320 / aspectRatio;
            
            const seekTime = Math.min(1, video.duration * 0.1);
            video.currentTime = seekTime;
          } catch (err) {
            clearTimeout(timeout);
            console.error('Error in onloadedmetadata:', err);
            setThumbnailStates(prev => ({ ...prev, [videoId]: 'error' }));
            resolve(null);
          }
        };
        
        video.onseeked = () => {
          try {
            clearTimeout(timeout);
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            setThumbnailStates(prev => ({ ...prev, [videoId]: 'completed' }));
            resolve(thumbnailDataUrl);
          } catch (err) {
            clearTimeout(timeout);
            console.error('Error generating thumbnail:', err);
            setThumbnailStates(prev => ({ ...prev, [videoId]: 'error' }));
            resolve(null);
          }
        };
        
        video.onerror = (err) => {
          clearTimeout(timeout);
          console.error('Video loading error for thumbnail generation:', err);
          setThumbnailStates(prev => ({ ...prev, [videoId]: 'error' }));
          resolve(null);
        };
        
        video.src = videoUrl;
      } catch (err) {
        console.error('Error setting up thumbnail generation:', err);
        setThumbnailStates(prev => ({ ...prev, [videoId]: 'error' }));
        resolve(null);
      }
    });
  };

  // Generate missing thumbnails
  useEffect(() => {
    const generateMissingThumbnails = async () => {
      for (const video of videos) {
        if (!video.thumbnailUrl && video.url && video.isUrlValid && !thumbnailStates[video.id]) {
          try {
            console.log('🖼️ Generating thumbnail for:', video.original_filename);
            const thumbnail = await generateThumbnailFromVideo(video.url, video.id);
            
            if (thumbnail) {
              setVideos(prev => prev.map(v => 
                v.id === video.id 
                  ? { ...v, generatedThumbnail: thumbnail }
                  : v
              ));
            }
          } catch (err) {
            console.error('Error in thumbnail generation process:', err);
          }
        }
      }
    };

    if (videos.length > 0) {
      generateMissingThumbnails();
    }
  }, [videos.length]);

  const handleDownloadVideo = async (video, event) => {
    event?.stopPropagation();
    
    if (!video.url || !video.isUrlValid) {
      setError('Video URL is not available for download');
      return;
    }
    
    try {
      setDownloadingStates(prev => ({ ...prev, [video.id]: true }));
      console.log('📥 Starting download for:', video.original_filename);
      
      try {
        console.log('🔄 Attempting blob download...');
        const response = await fetch(video.url, {
          method: 'GET',
          headers: {
            'Accept': 'video/webm,video/mp4,video/*',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = video.original_filename || `rental_video_${video.id}.mp4`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        
        console.log('✅ Blob download completed successfully');
        return;
      } catch (err) {
        console.warn('Blob download failed:', err);
      }

      try {
        const link = document.createElement('a');
        link.href = video.url;
        link.download = video.original_filename || `rental_video_${video.id}.mp4`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Direct download initiated');
        return;
      } catch (err) {
        console.warn('Direct download failed:', err);
      }

      console.log('🔗 Opening video in new tab as fallback');
      window.open(video.url, '_blank', 'noopener,noreferrer');
      
    } catch (err) {
      console.error('❌ Download failed:', err);
      setError(`Download failed: ${err.message}. Please try right-clicking the video and selecting "Save video as..."`);
    } finally {
      setDownloadingStates(prev => ({ ...prev, [video.id]: false }));
    }
  };

  const handleVideoClick = (video) => {
    if (!video.isUrlValid) {
      setError('Video URL is not accessible. Please try refreshing or contact support.');
      return;
    }
    
    const isMov = video.original_filename?.toLowerCase().endsWith('.mov');
    
    if (isMov) {
      console.log('🎬 Opening .mov file in new tab for iOS compatibility:', video.original_filename);
      window.open(video.url, '_blank');
    } else {
      console.log('🎬 Opening video modal for:', video.original_filename);
      setPlayingVideo(video);
      setVideoRetryCount(0);
    }
  };

  const closeVideoModal = () => {
    console.log('🔒 Closing video modal');
    setPlayingVideo(null);
    setVideoRetryCount(0);
  };

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPhaseLabel = (phase) => {
    return phase === 'out' ? 'Opening' : 'Closing';
  };

  const getPhaseColor = (phase) => {
    return phase === 'out' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
  };

  const VideoThumbnail = ({ video }) => {
    const thumbnailSrc = video.thumbnailUrl || video.generatedThumbnail;
    const isGenerating = thumbnailStates[video.id] === 'generating';
    const hasError = thumbnailStates[video.id] === 'error';

    return (
      <div 
        className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden group cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Play ${getPhaseLabel(video.phase)} video: ${video.original_filename}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleVideoClick(video);
          }
        }}
      >
        {thumbnailSrc && !isGenerating ? (
          <img
            src={thumbnailSrc}
            alt={`${getPhaseLabel(video.phase)} video thumbnail for ${video.original_filename}`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={() => {
              console.warn('Thumbnail failed to load for:', video.original_filename);
              setThumbnailStates(prev => ({ ...prev, [video.id]: 'error' }));
            }}
          />
        ) : isGenerating ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <span className="text-sm text-gray-600">Generating thumbnail...</span>
            </div>
          </div>
        ) : hasError ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm">Thumbnail unavailable</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <div className="text-center text-gray-500">
              <ImageIcon className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm">No thumbnail</span>
            </div>
          </div>
        )}
        
        {!video.isUrlValid && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs">
            URL Error
          </div>
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
          <div className="bg-white bg-opacity-90 rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-6 h-6 text-gray-800 fill-current" />
          </div>
        </div>
        
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
            {formatDuration(video.duration)}
          </div>
        )}
        
        <div className="absolute top-2 left-2">
          <Badge className={getPhaseColor(video.phase)}>
            {getPhaseLabel(video.phase)}
          </Badge>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Vehicle Condition Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading videos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Vehicle Condition Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-medium text-red-800">Error</span>
            </div>
            <p className="text-red-700 text-sm mb-3">{error}</p>
            <div className="flex gap-2">
              <Button 
                onClick={handleRetry} 
                variant="outline" 
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button 
                onClick={() => setError(null)} 
                variant="outline" 
                size="sm"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Vehicle Condition Videos
            {videos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {videos.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileVideo className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No videos recorded yet</p>
              <p className="text-sm">Videos will appear here once recorded</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => {
                const isMov = video.original_filename?.toLowerCase().endsWith('.mov');
                
                return (
                  <div
                    key={video.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                  >
                    <div onClick={() => handleVideoClick(video)}>
                      <VideoThumbnail video={video} />
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 truncate mb-2">
                        {video.original_filename}
                      </h4>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatTimestamp(video.timestamp)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(video.duration)}</span>
                          </div>
                          <span className="text-gray-500">
                            {formatFileSize(video.file_size)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVideoClick(video)}
                          className="flex-1"
                          disabled={!video.isUrlValid}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {isMov ? 'View' : 'Play'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadVideo(video, e)}
                          disabled={downloadingStates[video.id] || !video.isUrlValid}
                          className="min-w-[44px]"
                          title="Download video"
                        >
                          {downloadingStates[video.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {playingVideo && (
        <Dialog open={!!playingVideo} onOpenChange={(open) => !open && closeVideoModal()}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  {playingVideo.original_filename}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeVideoModal}
                  className="h-8 w-8 p-0"
                  aria-label="Close video player"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <DialogDescription>
                Video player for {playingVideo.original_filename}. {getPhaseLabel(playingVideo.phase)} vehicle condition recording.
              </DialogDescription>
            </DialogHeader>
            
            <div className="p-4">
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                <video
                  key={`${playingVideo.id}-${videoRetryCount}`}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[60vh]"
                  poster={playingVideo.thumbnailUrl || playingVideo.generatedThumbnail}
                  aria-label={`${getPhaseLabel(playingVideo.phase)} vehicle condition video`}
                  onError={(e) => {
                    console.error('❌ Video playback error:', e);
                    
                    if (videoRetryCount < 3) {
                      setTimeout(() => {
                        console.log(`🔄 Retrying video load (attempt ${videoRetryCount + 1}/3)...`);
                        setVideoRetryCount(prev => prev + 1);
                      }, 1500);
                    } else {
                      setError(`Video playback failed after 3 attempts. The video may be corrupted or the format is not supported.`);
                    }
                  }}
                  onLoadStart={() => {
                    console.log('📹 Video loading started...');
                  }}
                  onLoadedData={() => {
                    console.log('✅ Video loaded successfully');
                  }}
                >
                  <source src={`${playingVideo.url}?t=${Date.now()}`} type="video/mp4" />
                  <source src={`${playingVideo.url}?t=${Date.now()}`} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
                
                {videoRetryCount > 0 && videoRetryCount < 3 && (
                  <div className="absolute top-4 right-4 bg-yellow-600 text-white px-3 py-1 rounded text-sm">
                    Retrying... ({videoRetryCount}/3)
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Video Details</h4>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>Phase:</span>
                      <Badge className={getPhaseColor(playingVideo.phase)}>
                        {getPhaseLabel(playingVideo.phase)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{formatDuration(playingVideo.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span>{formatFileSize(playingVideo.file_size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>URL Status:</span>
                      <span className={playingVideo.isUrlValid ? 'text-green-600' : 'text-red-600'}>
                        {playingVideo.isUrlValid ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recording Info</h4>
                  <div className="space-y-1 text-gray-600">
                    <div className="flex justify-between">
                      <span>Recorded:</span>
                      <span>{formatTimestamp(playingVideo.timestamp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Filename:</span>
                      <span className="truncate ml-2">{playingVideo.original_filename}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleDownloadVideo(playingVideo, e)}
                  disabled={downloadingStates[playingVideo.id] || !playingVideo.isUrlValid}
                >
                  {downloadingStates[playingVideo.id] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={closeVideoModal}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default RentalVideos;