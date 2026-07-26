export interface PhotoProcessingOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png';
  /** Target max output size in bytes after compression */
  maxOutputBytes: number;
}

export interface PhotoUploadResult {
  success: boolean;
  photoUrl?: string;
  filename?: string;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
  width?: number;
  height?: number;
}

export interface CompressedPhotoResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * Service for handling passport photo uploads and processing
 */
export class PhotoService {
  
  // Standard passport photo dimensions (in pixels at 300 DPI) and size budget
  private static readonly PASSPORT_PHOTO_OPTIONS: PhotoProcessingOptions = {
    maxWidth: 413,   // 3.5cm at 300 DPI
    maxHeight: 531,  // 4.5cm at 300 DPI
    quality: 0.85,
    format: 'jpeg',
    maxOutputBytes: 150 * 1024, // 150KB
  };

  /**
   * Validates if the file is a valid image
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please select a valid image file (JPEG, JPG, PNG, or WebP)'
      };
    }

    // Check file size (max 10MB before compression)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'Image file must be smaller than 10MB'
      };
    }

    return { valid: true };
  }

  /**
   * Compress and crop an image to passport size, returning a File + preview URL.
   */
  static async compressPassportPhoto(file: File): Promise<CompressedPhotoResult> {
    const { maxWidth, maxHeight, maxOutputBytes } = this.PASSPORT_PHOTO_OPTIONS;
    const blob = await this.processPassportPhoto(file);
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.\w+$/, '') + '_passport.jpg',
      { type: 'image/jpeg', lastModified: Date.now() }
    );

    return {
      file: compressedFile,
      previewUrl: URL.createObjectURL(compressedFile),
      originalSize: file.size,
      compressedSize: compressedFile.size,
      width: maxWidth,
      height: maxHeight,
    };
  }

  /**
   * Processes and resizes image to exact passport photo dimensions with compression
   */
  static async processPassportPhoto(file: File): Promise<Blob> {
    const { maxWidth, maxHeight, quality, maxOutputBytes } = this.PASSPORT_PHOTO_OPTIONS;

    const img = await this.loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    canvas.width = maxWidth;
    canvas.height = maxHeight;

    // Cover-fit center crop so output is exactly passport size
    const scale = Math.max(maxWidth / img.width, maxHeight / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const offsetX = (maxWidth - drawWidth) / 2;
    const offsetY = (maxHeight - drawHeight) / 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, maxWidth, maxHeight);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    URL.revokeObjectURL(img.src);

    // Iteratively reduce JPEG quality until under size budget
    let currentQuality = quality;
    let blob = await this.canvasToBlob(canvas, currentQuality);

    while (blob.size > maxOutputBytes && currentQuality > 0.4) {
      currentQuality = Math.max(0.4, currentQuality - 0.1);
      blob = await this.canvasToBlob(canvas, currentQuality);
    }

    return blob;
  }

  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private static canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to compress image'));
        },
        'image/jpeg',
        quality
      );
    });
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
      await new Promise(resolve => setTimeout(resolve, 300));

      return {
        success: true,
        photoUrl: dataUrl, // In production: download URL from Firebase Storage
        filename: processedFilename,
        compressedSize: blob.size,
        width: this.PASSPORT_PHOTO_OPTIONS.maxWidth,
        height: this.PASSPORT_PHOTO_OPTIONS.maxHeight,
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
      const originalSize = file.size;
      // Process image (crop + compress to required passport size)
      const processedBlob = await this.processPassportPhoto(file);
      
      // Upload to storage
      const uploadResult = await this.uploadPassportPhoto(
        processedBlob, 
        employeeId, 
        file.name
      );

      return {
        ...uploadResult,
        originalSize,
        compressedSize: processedBlob.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Photo processing failed'
      };
    }
  }

  /**
   * Format bytes for UI display
   */
  static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
