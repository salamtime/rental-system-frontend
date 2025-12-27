import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Video, 
  Upload,
  Play, 
  Download, 
  Calendar, 
  Clock, 
  FileVideo, 
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// Import video components
import VideoContractModal from '../VideoContractModal';
import VideoModal from '../video/VideoModal';
import { formatDuration, formatFileSize } from '../../utils/videoUtils';

const VehicleConditionVideos = ({ rental, onUpdate }) => {
  const [videos, setVideos] = useState({ opening: [], closing: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Video upload states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadPhase, setUploadPhase] = useState('opening'); // 'opening' or 'closing'
  const [playingVideo, setPlayingVideo] = useState(null);

  useEffect(() => {
    if (!rental?.id) {
      setLoading(false);
      return;
    }
    loadVideos();
  }, [rental?.id]);

  const loadVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📹 Loading vehicle condition videos for rental:', rental.id);

      // Load all video records for this rental
      const { data: mediaRecords, error: mediaError } = await supabase
        .from('app_a5e250149b_rental_media')
        .select('*')
        .eq('rental_id', rental.id)
        .ilike('file_type', 'video%')
        .order('created_at', { ascending: false });

      if (mediaError) {
        console.error('Database error:', mediaError);
        throw new Error(`Failed to load videos: ${mediaError.message}`);
      }

      if (mediaRecords && mediaRecords.length > 0) {
        const openingVideos = [];
        const closingVideos = [];

        for (const record of mediaRecords) {
          try {
            // Determine the correct bucket based on phase
            const bucket = record.phase === 'out' || record.phase === 'opening' 
              ? 'rental-media-opening' 
              : 'rental-media-closing';
            
            // Try to get signed URL, fallback to public URL
            let videoUrl = record.public_url;
            try {
              const { data: signedUrl, error: urlError } = await supabase.storage
                .from(bucket)
                .createSignedUrl(record.storage_path, 7200); // 2 hours expiry
              
              if (!urlError && signedUrl) {
                videoUrl = signedUrl.signedUrl;
              }
            } catch (err) {
              console.warn('Could not generate signed URL, using public URL:', err);
            }

            // Generate thumbnail URL if exists
            let thumbnailUrl = null;
            if (record.poster_url) {
              try {
                const thumbnailPath = record.poster_url.split('/').pop();
                const { data: thumbnailSignedUrl, error: thumbnailUrlError } = await supabase.storage
                  .from(bucket)
                  .createSignedUrl(thumbnailPath, 7200);
                
                if (!thumbnailUrlError && thumbnailSignedUrl) {
                  thumbnailUrl = thumbnailSignedUrl.signedUrl;
                }
              } catch (err) {
                console.warn('Could not generate thumbnail signed URL:', err);
                thumbnailUrl = record.poster_url;
              }
            }

            const videoItem = {
              id: record.id,
              type: 'video',
              url: videoUrl,
              thumbnailUrl: thumbnailUrl,
              duration: record.duration || 0,
              timestamp: record.created_at,
              original_filename: record.original_filename,
              file_size: record.file_size,
              phase: record.phase,
              poster_url: record.poster_url,
              storage_path: record.storage_path
            };

            // Categorize by phase
            if (record.phase === 'out' || record.phase === 'opening') {
              openingVideos.push(videoItem);
            } else if (record.phase === 'in' || record.phase === 'closing') {
              closingVideos.push(videoItem);
            }
          } catch (recordError) {
            console.warn('Error processing video record:', record.id, recordError);
          }
        }

        console.log('📹 Videos loaded:', { opening: openingVideos.length, closing: closingVideos.length });
        setVideos({ opening: openingVideos, closing: closingVideos });
      } else {
        setVideos({ opening: [], closing: [] });
      }
    } catch (err) {
      console.error('Error loading videos:', err);
      setError(`Failed to load videos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartUpload = (phase) => {
    console.log(`📤 Starting ${phase} video upload`);
    setUploadPhase(phase);
    setIsUploadModalOpen(true);
  };

  const handleVideoSave = async (videoData) => {
    try {
      setSuccess('');
      setError('');
      
      console.log('💾 Saving video:', videoData);
      
      const { file, filename, phase, duration } = videoData;
      
      // Determine bucket based on phase
      const bucket = phase === 'opening' || phase === 'out' 
        ? 'rental-media-opening' 
        : 'rental-media-closing';
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = filename.split('.').pop();
      const uniqueFilename = `${phase}_${rental.id}_${timestamp}.${fileExtension}`;
      
      console.log(`📤 Uploading to bucket: ${bucket}, filename: ${uniqueFilename}`);
      
      // Upload video file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(uniqueFilename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uniqueFilename);

      // Save video metadata to database
      const { data: mediaRecord, error: dbError } = await supabase
        .from('app_a5e250149b_rental_media')
        .insert({
          rental_id: rental.id,
          file_type: file.type || 'video/mp4',
          file_size: file.size,
          original_filename: filename,
          storage_path: uniqueFilename,
          public_url: publicUrlData.publicUrl,
          phase: phase === 'opening' ? 'out' : 'in', // Map to database phase convention
          duration: duration,
          metadata: {
            uploaded_at: new Date().toISOString(),
            device_type: 'web',
            video_type: 'vehicle_condition'
          }
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database save failed: ${dbError.message}`);
      }

      console.log('✅ Video saved successfully:', mediaRecord);
      setSuccess(`${phase} video uploaded successfully!`);
      
      // Refresh videos list
      await loadVideos();
      
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error) {
      console.error('❌ Video save failed:', error);
      setError(`Failed to save video: ${error.message}`);
    }
  };

  const handleVideoClick = (video) => {
    console.log('🎬 Opening video modal for:', video.original_filename);
    setPlayingVideo(video);
  };

  const closeVideoModal = () => {
    setPlayingVideo(null);
  };

  const handleDownloadVideo = async (video) => {
    try {
      console.log('📥 Downloading video:', video.original_filename);
      
      // Fetch video as blob
      const response = await fetch(video.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = video.original_filename || `video_${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      
    } catch (error) {
      console.error('❌ Download failed:', error);
      setError(`Download failed: ${error.message}`);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getPhaseLabel = (phase) => {
    if (phase === 'out' || phase === 'opening') return 'Opening';
    if (phase === 'in' || phase === 'closing') return 'Closing';
    return phase;
  };

  const getPhaseColor = (phase) => {
    if (phase === 'out' || phase === 'opening') return 'bg-green-100 text-green-800';
    if (phase === 'in' || phase === 'closing') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Video card component
  const VideoCard = ({ video, phase }) => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Video Thumbnail */}
      <div 
        className="relative aspect-video bg-gray-100 cursor-pointer group"
        onClick={() => handleVideoClick(video)}
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <Video className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-200">
          <div className="bg-white bg-opacity-90 rounded-full p-3 transform scale-0 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-6 h-6 text-gray-800 fill-current" />
          </div>
        </div>
        
        {/* Duration Badge */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {/* Phase Badge */}
        <div className="absolute top-2 left-2">
          <Badge className={getPhaseColor(video.phase)}>
            {getPhaseLabel(video.phase)}
          </Badge>
        </div>
      </div>
      
      {/* Video Info */}
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
        
        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleVideoClick(video)}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Play
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadVideo(video)}
            className="min-w-[44px]"
            title="Download video"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Empty state component
  const EmptyState = ({ phase }) => (
    <div className="text-center py-8 text-gray-500">
      <FileVideo className="w-12 h-12 mx-auto mb-4 text-gray-400" />
      <p className="text-lg font-medium">No {phase} videos uploaded yet</p>
      <p className="text-sm mb-4">Upload a video to document the vehicle condition</p>
      <Button
        onClick={() => handleStartUpload(phase)}
        className="inline-flex items-center"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload {phase} Video
      </Button>
    </div>
  );

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
            <p className="text-red-700 text-sm">{error}</p>
            <Button 
              onClick={() => setError(null)} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalVideos = videos.opening.length + videos.closing.length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Vehicle Condition Videos
              {totalVideos > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalVideos}
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm text-green-600">{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm text-red-600">{error}</span>
            </div>
          )}

          {/* Tabbed Interface for Opening/Closing Videos */}
          <Tabs defaultValue="opening" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="opening" className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Opening Inspection
                {videos.opening.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {videos.opening.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="closing" className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                Closing Inspection
                {videos.closing.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {videos.closing.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Opening Videos Tab */}
            <TabsContent value="opening" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Opening Inspection Videos</h3>
                <Button
                  onClick={() => handleStartUpload('opening')}
                  className="inline-flex items-center"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Opening Video
                </Button>
              </div>

              {videos.opening.length === 0 ? (
                <EmptyState phase="opening" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.opening.map((video) => (
                    <VideoCard key={video.id} video={video} phase="opening" />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Closing Videos Tab */}
            <TabsContent value="closing" className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Closing Inspection Videos</h3>
                <Button
                  onClick={() => handleStartUpload('closing')}
                  className="inline-flex items-center"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Closing Video
                </Button>
              </div>

              {videos.closing.length === 0 ? (
                <EmptyState phase="closing" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.closing.map((video) => (
                    <VideoCard key={video.id} video={video} phase="closing" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Video Upload Modal */}
      <VideoContractModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onVideoSave={handleVideoSave}
        rentalId={rental?.id}
        phase={uploadPhase}
        customerName={rental?.customer_name || 'Customer'}
      />

      {/* Video Playback Modal */}
      {playingVideo && (
        <VideoModal
          isOpen={!!playingVideo}
          onClose={closeVideoModal}
          videoSrc={playingVideo.url}
          title={playingVideo.original_filename}
          description={`${getPhaseLabel(playingVideo.phase)} inspection video`}
          metadata={{
            file_size: playingVideo.file_size,
            duration: playingVideo.duration,
            created_at: formatTimestamp(playingVideo.timestamp),
            type: getPhaseLabel(playingVideo.phase)
          }}
        />
      )}
    </>
  );
};

export default VehicleConditionVideos;