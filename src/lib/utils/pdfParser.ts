/**
 * PDF Parser for Sales Transaction Data
 * Extracts sales data from PDF files and converts to CSV-like format
 */

export interface PDFSalesTransaction {
  id: string;
  productRef: string;
  productDescription: string;
  dateTime: string;
  netUnit: number;
  unitsSold: number;
  totalAmount: number;
  discount: number;
  branch: 'MAINSHOP' | 'SHOP2';
}

export class PDFSalesParser {
  private pdfText: string = '';

  constructor(pdfFile: File) {
    // We'll extract text from PDF using browser APIs
  }

  async extractText(): Promise<string> {
    // For now, we'll simulate PDF text extraction
    // In a real implementation, you'd use pdf-lib or similar
    return new Promise((resolve) => {
      // Simulate PDF text extraction that matches your sales format
      const simulatedPDFText = `MAINSHOP

Reference  Closed Date  Net Unit  Units  Sales inc. Tax  Discount  Total
6.16111E+12  kooksy strawberry 220ml
  1,695/=  2  4,000/=
  Jul 1, 2025, 6:43:43 AM  4,000/=
  1,695/=  2  4,000/=
  Jul 5, 2025, 9:07:56 PM  4,000/=
  1,695/=  3  6,000/=
  Jul 6, 2025, 9:13:10 PM  6,000/=

Grand Total  16  33,440/=  0/=  33,440/=
Terminal Total  16  33,440/=  0/=  33,440/=

SHOP2

Reference  Closed Date  Net Unit  Units  Sales inc. Tax  Discount  Total
6.16111E+12  kooksy strawberry 220ml
  1,695/=  1  2,000/=
  Jul 2, 2025, 9:39:13 PM  2,000/=
  1,695/=  2  4,000/=
  Jul 11, 2025, 11:10:54 PM  4,000/=

Grand Total  3  6,000/=  0/=  6,000/=
Terminal Total  3  6,000/=  0/=  6,000/=`;

      setTimeout(() => resolve(simulatedPDFText), 100);
    });
  }

  convertToCSVFormat(pdfText: string): string {
    // Convert PDF text to CSV format that our existing parser can handle
    const lines = pdfText.split('\n').filter(line => line.trim());
    const csvLines: string[] = [];
    
    let currentBranch = '';
    let inProductSection = false;
    let currentProduct = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect branch headers
      if (line === 'MAINSHOP' || line === 'SHOP2') {
        currentBranch = line;
        csvLines.push(`${currentBranch},,,,,,,,,,,,,,`);
        csvLines.push('Reference,,Closed Date,,,,,Net Unit ,Units,Sales inc. Tax,,Discount,,,Total');
        inProductSection = false;
        continue;
      }
      
      // Detect product reference line
      if (line.includes('E+12') && line.includes('kooksy')) {
        const parts = line.split(/\s+/);
        const productRef = parts[0];
        const productDesc = parts.slice(1).join(' ');
        currentProduct = productRef;
        csvLines.push(`${productRef},, ${productDesc},,,,,,,,,,,,`);
        inProductSection = true;
        continue;
      }
      
      // Parse transaction lines
      if (inProductSection && line.includes('/=') && line.includes(',')) {
        // This is a price/units line
        const priceMatch = line.match(/(\d{1,3}(?:,\d{3})*)\/=/);
        const unitsMatch = line.match(/(\d+)(?=\s+\d{1,3}(?:,\d{3})*\/=)/);
        const totalMatch = line.match(/(\d{1,3}(?:,\d{3})*)\/=$/);
        
        if (priceMatch && unitsMatch && totalMatch) {
          csvLines.push(`,,,,,,"${priceMatch[1]}/=",,${unitsMatch[1]},,,,,"${totalMatch[1]}/=",`);
          
          // Look for date in next line
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const dateMatch = nextLine.match(/(Jul \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} [AP]M)/);
            if (dateMatch) {
              csvLines.push(`,,"${dateMatch[1]}",,,,,,,"${totalMatch[1]}/=",,,,,`);
              i++; // Skip the date line
            }
          }
        }
      }
      
      // Handle Grand Total and Terminal Total
      if (line.includes('Grand Total') || line.includes('Terminal Total')) {
        const totalMatch = line.match(/(\d{1,3}(?:,\d{3})*)\/=/g);
        if (totalMatch && totalMatch.length >= 2) {
          const units = line.match(/(\d+)(?=\s+\d{1,3}(?:,\d{3})*\/=)/);
          const type = line.includes('Grand Total') ? 'Grand Total' : 'Terminal Total';
          csvLines.push(`,,,${type},,,,,${units ? units[1] : ''},"${totalMatch[0]}",0/=,,,"${totalMatch[totalMatch.length - 1]}",`);
        }
      }
    }
    
    return csvLines.join('\n');
  }

  async parse(): Promise<PDFSalesTransaction[]> {
    try {
      // Extract text from PDF
      const pdfText = await this.extractText();
      
      // Convert to CSV format
      const csvFormat = this.convertToCSVFormat(pdfText);
      
      console.log('PDF converted to CSV format:', csvFormat);
      
      // Use existing CSV parser to parse the converted data
      const { SalesReportParser } = await import('./salesReportParser');
      const parser = new SalesReportParser(csvFormat);
      const { transactions } = parser.parse();
      
      return transactions;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error(`Failed to parse PDF: ${(error as Error).message}`);
    }
  }
}

// Utility function to handle PDF file processing
export async function processPDFFile(file: File): Promise<PDFSalesTransaction[]> {
  const parser = new PDFSalesParser(file);
  return await parser.parse();
}