import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, Download, Trash2, Calendar, Clock, FileVideo, AlertCircle } from 'lucide-react';
import VideoModal from '../video/VideoModal';
import toast from 'react-hot-toast';

const VehicleConditionVideos = ({ rentalId }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [deletingVideoId, setDeletingVideoId] = useState(null);

  useEffect(() => {
    if (rentalId) {
      fetchVideos();
    }
  }, [rentalId]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      
      console.log('📹 Fetching videos for rental:', rentalId);
      
      // Fetch videos from rental_media table
      const { data, error } = await supabase
        .from('app_2f7bf469b0_rental_media')
        .select('*')
        .eq('rental_id', rentalId)
        .eq('file_type', 'video/webm')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching videos:', error);
        toast.error('Failed to load videos');
        return;
      }

      console.log('📹 Raw videos from database:', data);

      if (data && data.length > 0) {
        // Generate signed URLs for each video
        const videosWithUrls = await Promise.all(
          data.map(async (video) => {
            try {
              // Determine bucket based on phase
              const bucket = video.phase === 'out' ? 'rental-media-opening' : 'rental-media-closing';
              
              console.log(`🔗 Generating signed URL for video ${video.id} in bucket ${bucket}`);
              console.log(`   Storage path: ${video.storage_path || video.file_name}`);
              
              // Generate signed URL (valid for 1 hour)
              const { data: signedUrlData, error: urlError } = await supabase.storage
                .from(bucket)
                .createSignedUrl(video.storage_path || video.file_name, 3600);

              if (urlError) {
                console.error(`❌ Error generating signed URL for video ${video.id}:`, urlError);
                // Fallback to public URL if available
                return {
                  ...video,
                  url: video.public_url || null
                };
              }

              console.log(`✅ Signed URL generated for video ${video.id}:`, signedUrlData.signedUrl);

              return {
                ...video,
                url: signedUrlData.signedUrl,
                public_url: signedUrlData.signedUrl // Also set public_url for compatibility
              };
            } catch (err) {
              console.error(`❌ Error processing video ${video.id}:`, err);
              return {
                ...video,
                url: video.public_url || null
              };
            }
          })
        );

        console.log('📹 Videos with URLs:', videosWithUrls);
        setVideos(videosWithUrls || []);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error('Error in fetchVideos:', error);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVideo = (video) => {
    console.log('🎬 Playing video:', video);
    console.log('🎬 Video URL:', video.url);
    console.log('🎬 Video public_url:', video.public_url);
    
    if (!video.url && !video.public_url) {
      toast.error('Video URL not available');
      return;
    }
    
    setPlayingVideo(video);
  };

  const closeVideoModal = () => {
    setPlayingVideo(null);
  };

  const handleDownloadVideo = async (video) => {
    try {
      toast.loading('Downloading video...', { id: 'download' });
      
      const videoUrl = video.url || video.public_url;
      if (!videoUrl) {
        throw new Error('Video URL not available');
      }
      
      // Fetch the video file
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = video.original_filename || `video_${video.id}.webm`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Video downloaded successfully', { id: 'download' });
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video', { id: 'download' });
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingVideoId(videoId);
      toast.loading('Deleting video...', { id: 'delete' });

      // Get video details first
      const video = videos.find(v => v.id === videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Delete from storage
      const bucket = video.phase === 'out' ? 'rental-media-opening' : 'rental-media-closing';
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([video.storage_path || video.file_name]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('app_2f7bf469b0_rental_media')
        .delete()
        .eq('id', videoId);

      if (dbError) {
        throw dbError;
      }

      toast.success('Video deleted successfully', { id: 'delete' });
      
      // Refresh videos list
      await fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video', { id: 'delete' });
    } finally {
      setDeletingVideoId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <FileVideo className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No videos found</h3>
        <p className="mt-1 text-sm text-gray-500">
          No vehicle condition videos have been uploaded for this rental yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Videos Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Video Thumbnail/Preview */}
            <div className="relative aspect-video bg-gray-900">
              <video
                src={video.url || video.public_url}
                className="w-full h-full object-cover"
                preload="metadata"
              />
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-opacity">
                <button
                  onClick={() => handlePlayVideo(video)}
                  className="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-4 transition-all transform hover:scale-110"
                >
                  <Play className="w-8 h-8 text-blue-600" fill="currentColor" />
                </button>
              </div>

              {/* Phase Badge */}
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  video.phase === 'out' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {video.phase === 'out' ? 'Opening' : 'Closing'}
                </span>
              </div>

              {/* Duration Badge */}
              {video.duration && (
                <div className="absolute bottom-2 right-2">
                  <span className="px-2 py-1 text-xs font-semibold bg-black bg-opacity-70 text-white rounded">
                    {formatDuration(video.duration)}
                  </span>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="p-4 space-y-3">
              {/* Filename */}
              <h4 className="text-sm font-medium text-gray-900 truncate" title={video.original_filename}>
                {video.original_filename || 'Untitled Video'}
              </h4>

              {/* Metadata */}
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  <span>{formatDate(video.uploaded_at)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1.5" />
                    <span>{formatDuration(video.duration)}</span>
                  </div>
                  <span className="text-gray-500">{formatFileSize(video.file_size)}</span>
                </div>
              </div>

              {/* Action Buttons - Mobile Optimized */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handlePlayVideo(video)}
                  className="flex-1 min-h-[44px] px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center text-sm font-medium"
                >
                  <Play className="w-4 h-4 mr-1.5" />
                  Play
                </button>
                
                <button
                  onClick={() => handleDownloadVideo(video)}
                  className="min-h-[44px] px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center justify-center"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleDeleteVideo(video.id)}
                  disabled={deletingVideoId === video.id}
                  className="min-h-[44px] px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50 flex items-center justify-center"
                  title="Delete"
                >
                  {deletingVideoId === video.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {playingVideo && (
        <VideoModal
          isOpen={!!playingVideo}
          onClose={closeVideoModal}
          videoUrl={playingVideo.url || playingVideo.public_url}
          title={playingVideo.original_filename || 'Vehicle Condition Video'}
        />
      )}
    </div>
  );
};

export default VehicleConditionVideos;