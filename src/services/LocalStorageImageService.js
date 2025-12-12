// Local Storage Image Service - Fallback when Supabase storage fails
class LocalStorageImageService {
  constructor() {
    this.storageKey = 'customer_images';
  }

  /**
   * Store image in localStorage as base64
   */
  async storeImageLocally(imageFile, customerId, scanType = 'document') {
    try {
      console.log('📱 LOCAL STORAGE: Storing image locally for customer:', customerId);
      
      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageFile);
      
      // Create image record
      const imageRecord = {
        id: `${customerId}_${scanType}_${Date.now()}`,
        customerId: customerId,
        scanType: scanType,
        fileName: imageFile.name,
        base64Data: base64Image,
        mimeType: imageFile.type,
        size: imageFile.size,
        timestamp: new Date().toISOString(),
        publicUrl: `local://${customerId}/${imageFile.name}` // Mock URL for compatibility
      };

      // Get existing images
      const existingImages = this.getStoredImages();
      
      // Add new image
      existingImages[imageRecord.id] = imageRecord;
      
      // Store back to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(existingImages));
      
      console.log('✅ LOCAL STORAGE: Image stored successfully:', imageRecord.publicUrl);
      
      return {
        success: true,
        filePath: imageRecord.id,
        publicUrl: imageRecord.publicUrl,
        fileName: imageRecord.fileName,
        imageId: imageRecord.id
      };

    } catch (error) {
      console.error('❌ LOCAL STORAGE: Failed to store image:', error);
      return {
        success: false,
        error: error.message,
        publicUrl: null
      };
    }
  }

  /**
   * Convert image file to base64
   */
  async convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result); // Keep full data URL with prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get all stored images
   */
  getStoredImages() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ LOCAL STORAGE: Failed to get stored images:', error);
      return {};
    }
  }

  /**
   * Get image by ID
   */
  getImageById(imageId) {
    const images = this.getStoredImages();
    return images[imageId] || null;
  }

  /**
   * Get images by customer ID
   */
  getImagesByCustomerId(customerId) {
    const images = this.getStoredImages();
    return Object.values(images).filter(img => img.customerId === customerId);
  }

  /**
   * Delete image by ID
   */
  deleteImage(imageId) {
    try {
      const images = this.getStoredImages();
      delete images[imageId];
      localStorage.setItem(this.storageKey, JSON.stringify(images));
      return { success: true };
    } catch (error) {
      console.error('❌ LOCAL STORAGE: Failed to delete image:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    const images = this.getStoredImages();
    const imageCount = Object.keys(images).length;
    const totalSize = Object.values(images).reduce((sum, img) => sum + (img.size || 0), 0);
    
    return {
      imageCount,
      totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }
}

export default LocalStorageImageService;