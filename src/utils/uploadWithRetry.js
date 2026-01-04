/**
 * Generate thumbnail from video blob safely
 * @param {Blob} videoBlob - Video blob to generate thumbnail from
 * @returns {Promise<string>} - Data URL of the thumbnail
 */
async function generateThumbnail(videoBlob) {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        try {
          video.currentTime = 0.1;
        } catch (error) {
          reject(error);
        }
      };

      video.onseeked = () => {
        try {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              URL.revokeObjectURL(video.src);
              resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }, 'image/jpeg', 0.7);
        } catch (error) {
          URL.revokeObjectURL(video.src);
          reject(error);
        }
      };

      video.onerror = (e) => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video for thumbnail'));
      };

      video.src = URL.createObjectURL(videoBlob);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate thumbnail safely from video URL with proper error handling
 * @param {string} videoUrl - URL of the video (blob URL or public URL)
 * @param {string} thumbnailPath - Storage path for the thumbnail
 * @returns {Promise<string|null>} - Public URL of the uploaded thumbnail or null if failed
 */
export async function generateThumbnailSafe(videoUrl, thumbnailPath) {
  try {
    const { supabase } = await import('../lib/supabase');
    
    // Generate thumbnail from video URL
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Thumbnail generation timeout'));
      }, 10000);

      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        try {
          clearTimeout(timeout);
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          video.currentTime = Math.min(1, video.duration * 0.1);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      video.onseeked = async () => {
        try {
          clearTimeout(timeout);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }

            try {
              const { data, error } = await supabase.storage
                .from('rental-videos')
                .upload(thumbnailPath, blob, {
                  contentType: 'image/jpeg',
                  upsert: false
                });

              if (error) {
                console.warn('Thumbnail upload failed:', error);
                resolve(null);
                return;
              }

              const { data: urlData } = supabase.storage
                .from('rental-videos')
                .getPublicUrl(thumbnailPath);

              resolve(urlData.publicUrl);
            } catch (uploadError) {
              console.warn('Thumbnail upload error:', uploadError);
              resolve(null);
            }
          }, 'image/jpeg', 0.8);
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      video.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`Video loading failed: ${error.message || 'Unknown error'}`));
      };

      video.src = videoUrl;
    });
  } catch (error) {
    console.warn('Thumbnail generation failed:', error);
    return null;
  }
}

export async function uploadWithRetry(
  supabase,
  bucketName,
  filePath,
  fileBlob,
  maxRetries = 3,
  onProgress,
  isProcessingThumbnail,
  setIsProcessingThumbnail
) {
  console.log(`📤 Upload attempt 1/${maxRetries}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBlob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      console.log('✅ Upload successful:', publicUrlData.publicUrl);

      // Generate thumbnail with debouncing
      if (!isProcessingThumbnail) {
        setIsProcessingThumbnail(true);
        console.log('🖼️ Generating thumbnail...');
        
        try {
          const thumbnail = await generateThumbnail(fileBlob);
          console.log('✅ Thumbnail generated:', thumbnail.substring(0, 100) + '...');
          setIsProcessingThumbnail(false);
          
          // Safe URL revocation after successful upload
          if (fileBlob.url) {
            URL.revokeObjectURL(fileBlob.url);
            console.log('🗑️ Blob URL revoked safely after upload');
          }
          
          return { url: publicUrlData.publicUrl, thumbnail };
        } catch (thumbError) {
          console.error('❌ Thumbnail generation failed:', thumbError);
          setIsProcessingThumbnail(false);
          
          // Still revoke URL even if thumbnail fails
          if (fileBlob.url) {
            URL.revokeObjectURL(fileBlob.url);
          }
          
          return { url: publicUrlData.publicUrl, thumbnail: null };
        }
      } else {
        console.log('⏭️ Skipping duplicate thumbnail generation');
        return { url: publicUrlData.publicUrl, thumbnail: null };
      }

    } catch (error) {
      console.error(`❌ Upload attempt ${attempt} failed:`, error.message);

      if (attempt === maxRetries) {
        throw new Error(`Upload failed after ${maxRetries} attempts: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}