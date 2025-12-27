import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

/**
 * Media Capture Component
 * Handles camera capture, gallery upload, and video recording for rental documentation
 * Uses ONLY Supabase Storage - NO API endpoints
 */
const MediaCapture = ({ 
  rentalId, 
  phase = 'out', // 'out' for opening, 'in' for closing
  mandatory = false,
  allowGallery = true,
  onComplete 
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedFiles, setCapturedFiles] = useState([]);
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: phase === 'in' // Only include audio for closing videos
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
      setIsCapturing(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCapturedFiles(prev => [...prev, { file, type: 'photo', preview: URL.createObjectURL(blob) }]);
        toast.success('Photo captured successfully');
      }
    }, 'image/jpeg', 0.8);
  }, []);

  // Start video recording
  const startRecording = useCallback(() => {
    if (!stream) return;

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9' // Use VP9 for better compression
      });
      
      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
        setCapturedFiles(prev => [...prev, { 
          file, 
          type: 'video', 
          preview: URL.createObjectURL(blob),
          duration: recordingTime 
        }]);
        toast.success(`Video recorded successfully (${recordingTime}s)`);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  }, [stream, recordingTime]);

  // Stop video recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  }, [isRecording]);

  // Handle file upload from gallery
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name}: Only images and videos are allowed`);
        return;
      }

      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 20MB`);
        return;
      }

      setCapturedFiles(prev => [...prev, {
        file,
        type: isImage ? 'photo' : 'video',
        preview: URL.createObjectURL(file)
      }]);
    });

    // Reset file input
    event.target.value = '';
  };

  // Remove captured file
  const removeFile = (index) => {
    setCapturedFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Upload files DIRECTLY to Supabase Storage - NO API ENDPOINTS
  const uploadFiles = async () => {
    if (capturedFiles.length === 0) {
      toast.error('No files to upload');
      return;
    }

    // Validation for closing videos
    if (phase === 'in' && mandatory) {
      const hasVideo = capturedFiles.some(f => f.type === 'video');
      if (!hasVideo) {
        toast.error('Closing video is mandatory for rental completion');
        return;
      }

      // Check video duration (minimum 20 seconds)
      const videos = capturedFiles.filter(f => f.type === 'video');
      const shortVideos = videos.filter(v => v.duration && v.duration < 20);
      if (shortVideos.length > 0) {
        toast.error('Closing videos must be at least 20 seconds long');
        return;
      }
    }

    setIsUploading(true);

    try {
      const uploadPromises = capturedFiles.map(async (fileData, index) => {
        const { file } = fileData;
        const timestamp = Date.now();
        const fileName = `${rentalId}/${timestamp}_${index}_${file.name}`;
        const bucketName = phase === 'out' ? 'rental-media-opening' : 'rental-media-closing';

        console.log(`Uploading to Supabase Storage: ${bucketName}/${fileName}`);

        // Upload DIRECTLY to Supabase Storage - NO API CALLS
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);
        }

        console.log('Upload successful:', uploadData);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);

        console.log('Public URL generated:', urlData.publicUrl);

        // Save media record DIRECTLY to Supabase database - NO API CALLS
        const { error: dbError } = await supabase
          .from('app_2f7bf469b0_rental_media')
          .insert({
            rental_id: rentalId,
            file_name: fileName,
            original_filename: file.name,
            file_type: file.type,
            file_size: file.size,
            phase: phase,
            storage_path: uploadData.path,
            public_url: urlData.publicUrl,
            uploaded_at: new Date().toISOString(),
            duration: fileData.duration || null
          });

        if (dbError) {
          console.error('Database error:', dbError);
          // Don't throw here, just log - file is uploaded successfully
        } else {
          console.log('Database record saved successfully');
        }

        return {
          fileName,
          publicUrl: urlData.publicUrl,
          originalName: file.name
        };
      });

      const results = await Promise.all(uploadPromises);
      
      toast.success(`Successfully uploaded ${results.length} file(s) to Supabase Storage`);
      
      // Clean up preview URLs
      capturedFiles.forEach(fileData => {
        URL.revokeObjectURL(fileData.preview);
      });
      
      setCapturedFiles([]);
      stopCamera();
      
      if (onComplete) {
        onComplete(results);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload files to Supabase Storage');
    } finally {
      setIsUploading(false);
    }
  };

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Camera Controls - Mobile Optimized */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {!isCapturing ? (
          <button
            onClick={startCamera}
            className="min-h-[48px] px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <span className="hidden sm:inline">Start Camera</span>
            <span className="sm:hidden">Camera</span>
          </button>
        ) : (
          <>
            <button
              onClick={capturePhoto}
              disabled={isRecording}
              className="min-h-[48px] px-3 sm:px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span className="hidden sm:inline">Capture Photo</span>
              <span className="sm:hidden">Photo</span>
            </button>

            {!isRecording ? (
              <button
                onClick={startRecording}
                className="min-h-[48px] px-3 sm:px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="6"/>
                </svg>
                <span className="hidden sm:inline">Record Video</span>
                <span className="sm:hidden">Record</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="min-h-[48px] px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12"/>
                </svg>
                <span className="hidden sm:inline">Stop ({formatTime(recordingTime)})</span>
                <span className="sm:hidden">{formatTime(recordingTime)}</span>
              </button>
            )}

            <button
              onClick={stopCamera}
              className="min-h-[48px] px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Stop Camera</span>
              <span className="sm:hidden">Stop</span>
            </button>
          </>
        )}

        {allowGallery && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[48px] px-3 sm:px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Upload from Gallery</span>
              <span className="sm:hidden">Gallery</span>
            </button>
          </>
        )}
      </div>

      {/* Camera Preview - Mobile Optimized */}
      {isCapturing && (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 sm:h-64 md:h-96 object-cover"
          />
          {isRecording && (
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-red-500 text-white px-2 sm:px-3 py-1 rounded-full flex items-center text-xs sm:text-sm">
              <div className="w-2 h-2 bg-white rounded-full mr-1 sm:mr-2 animate-pulse"></div>
              REC {formatTime(recordingTime)}
            </div>
          )}
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Captured Files Preview - Mobile Optimized */}
      {capturedFiles.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h4 className="text-base sm:text-lg font-semibold">Captured Files ({capturedFiles.length})</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
            {capturedFiles.map((fileData, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {fileData.type === 'photo' ? (
                    <img
                      src={fileData.preview}
                      alt={`Captured ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full">
                      <video
                        src={fileData.preview}
                        className="w-full h-full object-cover"
                        controls={false}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                      {fileData.duration && (
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1 rounded">
                          {formatTime(fileData.duration)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-sm"
                >
                  ×
                </button>
                
                <div className="mt-1 text-xs text-gray-600 truncate">
                  {fileData.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button - Mobile Optimized */}
      {capturedFiles.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={uploadFiles}
            disabled={isUploading}
            className="min-h-[48px] w-full sm:w-auto px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading to Supabase...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Complete {phase === 'out' ? 'Opening' : 'Closing'} Documentation
              </>
            )}
          </button>
        </div>
      )}

      {/* Instructions - Mobile Optimized */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <h5 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">
          {phase === 'out' ? 'Opening Documentation Instructions' : 'Closing Documentation Instructions'}
        </h5>
        <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
          {phase === 'out' ? (
            <>
              <li>• Capture photos/videos of the vehicle's current condition</li>
              <li>• Document any existing damage, scratches, or issues</li>
              <li>• Include multiple angles and close-ups of important areas</li>
              <li>• You can upload from gallery or use the camera</li>
            </>
          ) : (
            <>
              <li>• Record a video showing the vehicle's return condition</li>
              <li>• Video must be at least 20 seconds long</li>
              <li>• Document any new damage or changes</li>
              <li>• This video is mandatory for rental completion</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default MediaCapture;