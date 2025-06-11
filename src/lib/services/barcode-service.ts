import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export type CodeType = 'barcode' | 'qrcode';
export type BarcodeFormat = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39' | 'ITF14';

export interface ItemCode {
  id: string;
  itemName: string;
  itemDescription: string;
  category: string;
  supplierName: string;
  receivedDate: Date;
  codeType: CodeType;
  codeValue: string; // The actual barcode/QR code data
  barcodeFormat?: BarcodeFormat; // Only for barcodes
  generatedBy: string; // Employee ID
  generatedAt: Date;
  printSettings: {
    width: number;
    height: number;
    labelSize: string; // e.g., "2x1", "3x2", etc.
  };
  status: 'Active' | 'Inactive';
  notes?: string;
}

export interface PrintSettings {
  width: number; // in mm
  height: number; // in mm
  labelSize: string;
  showText: boolean;
  fontSize: number;
  margin: number;
}

export class BarcodeService {
  
  // Generate a unique code value for an item
  static generateCodeValue(itemName: string, category: string): string {
    const timestamp = Date.now().toString();
    const itemCode = itemName.substring(0, 3).toUpperCase();
    const categoryCode = category.substring(0, 2).toUpperCase();
    return `${categoryCode}${itemCode}${timestamp.slice(-8)}`;
  }

  // Generate format-specific code value
  static generateFormatSpecificCode(itemName: string, category: string, format: BarcodeFormat): string {
    const timestamp = Date.now().toString();
    
    switch (format) {
      case 'UPC':
        // UPC requires exactly 12 digits
        const upcTimestamp = timestamp.slice(-8);
        const upcPrefix = '1234'; // Store prefix or use category-based numeric mapping
        return (upcPrefix + upcTimestamp).padEnd(12, '0').substring(0, 12);
        
      case 'EAN13':
        // EAN13 requires exactly 13 digits
        const eanTimestamp = timestamp.slice(-9);
        const eanPrefix = '123'; // Country/store prefix
        return (eanPrefix + eanTimestamp).padEnd(13, '0').substring(0, 13);
        
      case 'ITF14':
        // ITF14 requires exactly 14 digits
        const itfTimestamp = timestamp.slice(-10);
        const itfPrefix = '1234'; // Application identifier
        return (itfPrefix + itfTimestamp).padEnd(14, '0').substring(0, 14);
        
      case 'CODE39':
        // CODE39 supports alphanumeric but limited character set
        const itemCode = itemName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
        const categoryCode = category.substring(0, 2).toUpperCase().replace(/[^A-Z0-9]/g, '');
        return `${categoryCode}${itemCode}${timestamp.slice(-6)}`;
        
      case 'CODE128':
      default:
        // CODE128 is flexible and can handle most characters
        return this.generateCodeValue(itemName, category);
    }
  }

  // Generate barcode as SVG
  static generateBarcodeSVG(
    codeValue: string, 
    format: BarcodeFormat = 'CODE128',
    settings?: Partial<PrintSettings>
  ): string {
    try {
      console.log('Generating barcode:', { codeValue, format, settings });
      
      // Validate the code value for the selected format
      if (!this.validateBarcodeValue(codeValue, format)) {
        // If invalid, generate a format-specific code
        console.warn(`Code "${codeValue}" is invalid for ${format}, generating format-specific code`);
        // For this case, we'll fall back to CODE128 which is more flexible
        if (format !== 'CODE128') {
          format = 'CODE128';
        }
      }

      // Create a temporary canvas element
      const canvas = document.createElement('canvas');
      canvas.width = 400; // Set explicit width
      canvas.height = 200; // Set explicit height
      
      const options = {
        format: format,
        width: settings?.width || 2,
        height: settings?.height || 100,
        displayValue: settings?.showText ?? true,
        fontSize: settings?.fontSize || 20,
        margin: settings?.margin || 10,
        background: '#ffffff',
        lineColor: '#000000'
      };

      console.log('JsBarcode options:', options);
      JsBarcode(canvas, codeValue, options);
      
      // Convert canvas to data URL and return as img tag
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Generated barcode data URL length:', dataUrl.length);
      const imgTag = `<img src="${dataUrl}" alt="Barcode: ${codeValue}" style="max-width: 100%; height: auto;" />`;
      console.log('Generated img tag:', imgTag.substring(0, 100) + '...');
      return imgTag;
      
    } catch (error) {
      console.error('Error generating barcode:', error);
      // Fallback to CODE128 if the selected format fails
      if (format !== 'CODE128') {
        console.log('Falling back to CODE128 format');
        return this.generateBarcodeSVG(codeValue, 'CODE128', settings);
      }
      throw new Error(`Failed to generate barcode: ${error.message}`);
    }
  }

  // Generate QR code as SVG
  static async generateQRCodeSVG(
    codeValue: string,
    settings?: Partial<PrintSettings>
  ): Promise<string> {
    try {
      const options = {
        width: settings?.width || 200,
        height: settings?.height || 200,
        margin: settings?.margin || 4,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      };

      const dataUrl = await QRCode.toDataURL(codeValue, options);
      return `<img src="${dataUrl}" alt="QR Code: ${codeValue}" style="max-width: 100%; height: auto;" />`;
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  // Generate barcode for printing with specific dimensions
  static generatePrintableBarcode(
    codeValue: string,
    format: BarcodeFormat,
    printSettings: PrintSettings
  ): string {
    try {
      const canvas = document.createElement('canvas');
      
      // Calculate dimensions based on print settings
      const dpi = 300; // 300 DPI for high quality printing
      const widthPx = (printSettings.width / 25.4) * dpi; // Convert mm to pixels
      const heightPx = (printSettings.height / 25.4) * dpi;
      
      canvas.width = widthPx;
      canvas.height = heightPx;

      const options = {
        format: format,
        width: 3, // Line width
        height: heightPx * 0.7, // 70% of label height for barcode
        displayValue: printSettings.showText,
        fontSize: printSettings.fontSize,
        margin: printSettings.margin,
        background: '#ffffff',
        lineColor: '#000000'
      };

      JsBarcode(canvas, codeValue, options);
      return canvas.toDataURL('image/png');
      
    } catch (error) {
      console.error('Error generating printable barcode:', error);
      throw new Error('Failed to generate printable barcode');
    }
  }

  // Generate QR code for printing with specific dimensions
  static async generatePrintableQRCode(
    codeValue: string,
    printSettings: PrintSettings
  ): Promise<string> {
    try {
      const dpi = 300; // 300 DPI for high quality printing
      const sizePx = Math.min(
        (printSettings.width / 25.4) * dpi,
        (printSettings.height / 25.4) * dpi
      );
      
      const options = {
        width: sizePx,
        margin: printSettings.margin,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      };

      return await QRCode.toDataURL(codeValue, options);
      
    } catch (error) {
      console.error('Error generating printable QR code:', error);
      throw new Error('Failed to generate printable QR code');
    }
  }

  // Get predefined label sizes
  static getLabelSizes(): Array<{label: string, width: number, height: number}> {
    return [
      { label: '1"×1" Square', width: 25.4, height: 25.4 },
      { label: '2"×1" Rectangle', width: 50.8, height: 25.4 },
      { label: '3"×1" Rectangle', width: 76.2, height: 25.4 },
      { label: '2"×2" Square', width: 50.8, height: 50.8 },
      { label: '3"×2" Rectangle', width: 76.2, height: 50.8 },
      { label: '4"×2" Rectangle', width: 101.6, height: 50.8 },
      { label: '4"×3" Rectangle', width: 101.6, height: 76.2 },
      { label: '4"×6" Rectangle', width: 101.6, height: 152.4 },
      { label: 'Custom', width: 0, height: 0 }
    ];
  }

  // Validate barcode value based on format
  static validateBarcodeValue(value: string, format: BarcodeFormat): boolean {
    switch (format) {
      case 'CODE128':
        return value.length > 0 && value.length <= 80;
      case 'EAN13':
        return /^\d{13}$/.test(value);
      case 'UPC':
        return /^\d{12}$/.test(value);
      case 'CODE39':
        return /^[A-Z0-9\-. $\/+%]+$/.test(value) && value.length <= 43;
      case 'ITF14':
        return /^\d{14}$/.test(value);
      default:
        return true;
    }
  }

  // Generate multiple codes for batch printing
  static async generateBatchCodes(
    items: Array<{
      itemName: string;
      category: string;
      codeType: CodeType;
      barcodeFormat?: BarcodeFormat;
    }>,
    printSettings: PrintSettings
  ): Promise<Array<{item: any, codeDataUrl: string, codeValue: string}>> {
    const results = [];
    
    for (const item of items) {
      const codeValue = this.generateFormatSpecificCode(item.itemName, item.category, item.barcodeFormat || 'CODE128');
      
      let codeDataUrl: string;
      if (item.codeType === 'barcode') {
        codeDataUrl = this.generatePrintableBarcode(
          codeValue, 
          item.barcodeFormat || 'CODE128', 
          printSettings
        );
      } else {
        codeDataUrl = await this.generatePrintableQRCode(codeValue, printSettings);
      }
      
      results.push({
        item,
        codeDataUrl,
        codeValue
      });
    }
    
    return results;
  }

  // Create a printable sheet with multiple codes
  static createPrintableSheet(
    codes: Array<{codeDataUrl: string, itemName: string, codeValue: string}>,
    printSettings: PrintSettings,
    codesPerRow: number = 3
  ): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // A4 size at 300 DPI
    const a4Width = (210 / 25.4) * 300; // 210mm A4 width
    const a4Height = (297 / 25.4) * 300; // 297mm A4 height
    
    canvas.width = a4Width;
    canvas.height = a4Height;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const labelWidth = (printSettings.width / 25.4) * 300;
    const labelHeight = (printSettings.height / 25.4) * 300;
    const margin = 20;
    
    let x = margin;
    let y = margin;
    let currentRow = 0;
    
    codes.forEach((code, index) => {
      if (index > 0 && index % codesPerRow === 0) {
        // Move to next row
        x = margin;
        y += labelHeight + margin;
        currentRow++;
      }
      
      // Draw the code image
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, x, y, labelWidth, labelHeight);
        
        // Add text if needed
        if (printSettings.showText) {
          ctx.fillStyle = '#000000';
          ctx.font = `${printSettings.fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(
            code.itemName, 
            x + labelWidth / 2, 
            y + labelHeight + 15
          );
        }
      };
      img.src = code.codeDataUrl;
      
      x += labelWidth + margin;
    });
    
    return canvas.toDataURL('image/png');
  }
}

export default BarcodeService; 