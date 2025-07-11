export interface PhotoProcessingOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png';
}

export interface PhotoUploadResult {
  success: boolean;
  photoUrl?: string;
  filename?: string;
  error?: string;
}

/**
 * Service for handling passport photo uploads and processing
 */
export class PhotoService {
  
  // Standard passport photo dimensions (in pixels at 300 DPI)
  private static readonly PASSPORT_PHOTO_OPTIONS: PhotoProcessingOptions = {
    maxWidth: 413,   // 3.5cm at 300 DPI
    maxHeight: 531,  // 4.5cm at 300 DPI
    quality: 0.9,
    format: 'jpeg'
  };

  /**
   * Validates if the file is a valid image
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please select a valid image file (JPEG, JPG, or PNG)'
      };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Image file must be smaller than 5MB'
      };
    }

    return { valid: true };
  }

  /**
   * Processes and resizes image to passport photo dimensions
   */
  static async processPassportPhoto(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          const { maxWidth, maxHeight, quality } = this.PASSPORT_PHOTO_OPTIONS;
          
          // Calculate dimensions maintaining aspect ratio
          let { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            maxWidth, 
            maxHeight
          );

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and resize image
          ctx!.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to process image'));
            }
          }, 'image/jpeg', quality);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate dimensions maintaining aspect ratio within constraints
   */
  private static calculateDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // Scale down if too large
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return { width: Math.round(width), height: Math.round(height) };
  }

  /**
   * Converts blob to base64 data URL for temporary display
   */
  static async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Uploads processed photo to storage (placeholder implementation)
   * In a real implementation, this would upload to Firebase Storage or similar
   */
  static async uploadPassportPhoto(
    blob: Blob, 
    employeeId: string, 
    filename: string
  ): Promise<PhotoUploadResult> {
    try {
      // For now, we'll convert to base64 and store as data URL
      // In production, upload to Firebase Storage and get download URL
      const dataUrl = await this.blobToDataUrl(blob);
      
      // Generate unique filename
      const timestamp = Date.now();
      const processedFilename = `passport_${employeeId}_${timestamp}_${filename}`;

      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      return {
        success: true,
        photoUrl: dataUrl, // In production: download URL from Firebase Storage
        filename: processedFilename
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Full workflow: validate, process, and upload passport photo
   */
  static async handlePassportPhotoUpload(
    file: File, 
    employeeId: string
  ): Promise<PhotoUploadResult> {
    // Validate file
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    try {
      // Process image
      const processedBlob = await this.processPassportPhoto(file);
      
      // Upload to storage
      const uploadResult = await this.uploadPassportPhoto(
        processedBlob, 
        employeeId, 
        file.name
      );

      return uploadResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Photo processing failed'
      };
    }
  }

  /**
   * Creates a preview URL for displaying uploaded image
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Cleans up preview URL to prevent memory leaks
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const photoService = PhotoService; 