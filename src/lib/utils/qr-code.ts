import QRCode from 'qrcode';

// Generic QR code generation function
export async function generateQRCode(data: string, options?: {
  width?: number;
  margin?: number;
  color?: { dark: string; light: string };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: options?.width || 200,
      margin: options?.margin || 2,
      color: {
        dark: options?.color?.dark || '#000000',
        light: options?.color?.light || '#FFFFFF'
      },
      errorCorrectionLevel: options?.errorCorrectionLevel || 'M'
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

export class QRCodeService {
  // Generate QR code data URL for an invoice
  static async generateInvoiceQRCode(invoiceId: string, invoiceNumber: string): Promise<string> {
    try {
      // Create the URL that will be encoded in the QR code
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://unison-technologies.com';
      const qrCodeUrl = `${baseUrl}/invoice/${invoiceId}?ref=${invoiceNumber}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  // Generate QR code as SVG string for better print quality
  static async generateInvoiceQRCodeSVG(invoiceId: string, invoiceNumber: string): Promise<string> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://unison-technologies.com';
      const qrCodeUrl = `${baseUrl}/invoice/${invoiceId}?ref=${invoiceNumber}`;
      
      const svgString = await QRCode.toString(qrCodeUrl, {
        type: 'svg',
        width: 120,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      return svgString;
    } catch (error) {
      console.error('Error generating QR code SVG:', error);
      throw new Error('Failed to generate QR code SVG');
    }
  }

  // Generate QR code for sharing purposes (with additional metadata)
  static async generateShareableQRCode(invoiceData: {
    id: string;
    invoiceNumber: string;
    supplierName: string;
    amount: number;
    date: string;
  }): Promise<string> {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://unison-technologies.com';
      
      // Create a more detailed URL with query parameters
      const shareUrl = new URL(`${baseUrl}/invoice/${invoiceData.id}`);
      shareUrl.searchParams.set('ref', invoiceData.invoiceNumber);
      shareUrl.searchParams.set('supplier', invoiceData.supplierName);
      shareUrl.searchParams.set('amount', invoiceData.amount.toString());
      shareUrl.searchParams.set('date', invoiceData.date);
      
      const qrCodeDataUrl = await QRCode.toDataURL(shareUrl.toString(), {
        width: 300,
        margin: 3,
        color: {
          dark: '#6B46C1', // Purple color to match brand
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // Higher error correction for sharing
      });
      
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating shareable QR code:', error);
      throw new Error('Failed to generate shareable QR code');
    }
  }

  // Validate if a URL is a valid invoice QR code URL
  static isValidInvoiceQRUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.startsWith('/invoice/') && parsedUrl.searchParams.has('ref');
    } catch {
      return false;
    }
  }

  // Extract invoice information from QR code URL
  static extractInvoiceInfoFromUrl(url: string): { invoiceId: string; invoiceNumber: string } | null {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/');
      const invoiceId = pathParts[pathParts.length - 1];
      const invoiceNumber = parsedUrl.searchParams.get('ref');
      
      if (invoiceId && invoiceNumber) {
        return { invoiceId, invoiceNumber };
      }
      
      return null;
    } catch {
      return null;
    }
  }
} 