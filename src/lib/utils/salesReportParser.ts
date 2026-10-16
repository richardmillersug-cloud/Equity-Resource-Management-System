/**
 * Specialized parser for the "Sales by Product" CSV report format
 * Handles the complex multi-section format with MAINSHOP and SHOP2 data
 */

export interface ParsedSalesTransaction {
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

export interface SalesReportSummary {
  reportPeriod: {
    start: string;
    end: string;
  };
  printDate: string;
  branches: Array<{
    name: 'MAINSHOP' | 'SHOP2';
    grandTotal: number;
    terminalTotal: number;
  }>;
}

export class SalesReportParser {
  private lines: string[];
  private currentLineIndex: number = 0;
  private currentBranch: 'MAINSHOP' | 'SHOP2' | null = null;
  
  constructor(csvContent: string) {
    this.lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }

  parse(): { transactions: ParsedSalesTransaction[], summary: SalesReportSummary } {
    const transactions: ParsedSalesTransaction[] = [];
    
    // Parse header information first
    const summary = this.parseCompleteHeader();
    
    console.log('CSV Lines preview:', this.lines.slice(0, 10));
    console.log('Total lines in CSV:', this.lines.length);

    // Start parsing from beginning (line 0)
    this.currentLineIndex = 0;
    this.currentBranch = 'MAINSHOP'; // Default branch since format doesn't specify

    // Parse product sections
    while (this.currentLineIndex < this.lines.length) {
      const line = this.lines[this.currentLineIndex];
      
      console.log(`Processing line ${this.currentLineIndex}: ${line.substring(0, 100)}...`);
      
      // Skip header lines
      if (this.isBranchHeader(line)) {
        console.log(`Skipping header line: ${line.substring(0, 50)}`);
        this.currentLineIndex++;
        continue;
      }

      // Parse product sections
      if (this.isProductLine(line)) {
        console.log(`Found product line: ${line.substring(0, 50)}`);
        const productTransactions = this.parseProductSection();
        transactions.push(...productTransactions);
        console.log(`Added ${productTransactions.length} transactions`);
        continue;
      }

      // Skip total lines and empty lines
      if (this.isBranchTotal(line) || line.trim() === '') {
        console.log(`Skipping total/empty line: ${line.substring(0, 50)}`);
        this.currentLineIndex++;
        continue;
      }

      this.currentLineIndex++;
    }

    console.log(`Total transactions parsed: ${transactions.length}`);
    return { transactions, summary };
  }


  private parseCompleteHeader(): SalesReportSummary {
    const summary: SalesReportSummary = {
      reportPeriod: { start: 'July 2025', end: 'July 2025' },
      printDate: new Date().toLocaleDateString(),
      branches: []
    };

    console.log('Processing product-by-product CSV format');
    console.log('Format: Product sections with transaction pairs');

    return summary;
  }

  private findFirstBranch(): void {
    // Find the first product section (skip header)
    while (this.currentLineIndex < this.lines.length) {
      const line = this.lines[this.currentLineIndex];
      if (this.isProductLine(line)) {
        console.log(`Found first product at line ${this.currentLineIndex}: ${line.substring(0, 50)}...`);
        break;
      }
      this.currentLineIndex++;
    }
  }

  private isBranchHeader(line: string): boolean {
    // Check if this is a header line that we should skip
    return line.includes('Closed Date') && line.includes('Net Unit');
  }

  private extractBranch(line: string): 'MAINSHOP' | 'SHOP2' {
    // Since the file doesn't have branches, default to MAINSHOP
    return 'MAINSHOP';
  }



  private isProductLine(line: string): boolean {
    const columns = line.split(',');
    // Product line starts with a space and product name in first column
    // Example: " kooksy strawberry 220ml,,,,,,,,,,,,,"
    return columns.length > 3 && 
           columns[0].trim().length > 0 && 
           !columns[0].includes('Closed Date') && // Not a header
           !columns[0].includes('Grand Total') && // Not a total line
           !columns[0].includes('Terminal Total') && // Not a total line
           !line.includes('/=') && // Not a price/amount line
           !line.includes('"Jul') && // Not a date line
           columns[0].trim() !== ''; // Not empty
  }

  private parseProductSection(): ParsedSalesTransaction[] {
    const transactions: ParsedSalesTransaction[] = [];
    
    if (this.currentLineIndex >= this.lines.length) return transactions;
    
    const productLine = this.lines[this.currentLineIndex];
    const columns = productLine.split(',');
    
    // Extract product info from first line: " kooksy strawberry 220ml,,,,,,,,,,,,,"
    const productDescription = columns[0]?.trim() || '';
    const productRef = productDescription.replace(/\s+/g, '_').toUpperCase(); // Generate reference from name
    
    console.log(`Parsing product: ${productRef} - ${productDescription}`);
    
    if (!productDescription) {
      this.currentLineIndex++;
      return transactions;
    }

    this.currentLineIndex++; // Move to transaction data

    // Parse all transaction pairs for this product
    while (this.currentLineIndex < this.lines.length) {
      const line = this.lines[this.currentLineIndex];
      
      // Stop if we hit another product, total, or empty section
      if (this.isProductLine(line) || this.isBranchTotal(line) || this.isBranchHeader(line) || line.trim() === '') {
        break;
      }

      // Check if this is a price/units line: ,,,,"1,695/=",,2,,,,,"4,000/=",,
      const priceUnitsMatch = line.match(/(\d{1,3}(?:,\d{3})*)\/=.*?(\d+)/);
      if (priceUnitsMatch) {
        console.log(`Found price/units line: ${line.substring(0, 50)}...`);
        
        // Look for the corresponding date/time line
        const nextLineIndex = this.currentLineIndex + 1;
        if (nextLineIndex < this.lines.length) {
          const nextLine = this.lines[nextLineIndex];
          const dateTimeMatch = nextLine.match(/"([^"]+, \d{4}, \d{1,2}:\d{2}:\d{2} [AP]M)"/);
          
          if (dateTimeMatch) {
            const transaction = this.createTransaction(
              productRef, 
              productDescription, 
              priceUnitsMatch, 
              dateTimeMatch, 
              nextLine
            );
            
            if (transaction) {
              transactions.push(transaction);
              console.log(`Created transaction for ${productDescription}`);
            }
            
            // Skip the date/time line since we processed it
            this.currentLineIndex += 2;
            continue;
          }
        }
      }

      this.currentLineIndex++;
    }

    console.log(`Total transactions for ${productDescription}: ${transactions.length}`);
    return transactions;
  }

  private createTransaction(
    productRef: string, 
    productDescription: string, 
    priceUnitsMatch: RegExpMatchArray, 
    dateTimeMatch: RegExpMatchArray, 
    dateTimeLine: string
  ): ParsedSalesTransaction | null {
    // Default to MAINSHOP since this format doesn't specify branches
    const branch: 'MAINSHOP' | 'SHOP2' = 'MAINSHOP';

    const netUnit = this.parseAmount(priceUnitsMatch[1]);
    const units = parseInt(priceUnitsMatch[2]);
    const dateTime = dateTimeMatch[1];
    
    // Extract total amount from the date/time line
    const totalMatch = dateTimeLine.match(/(\d{1,3}(?:,\d{3})*)\/=/);
    if (!totalMatch) return null;
    const totalAmount = this.parseAmount(totalMatch[1]);

    return {
      id: `${productRef}_${branch}_${Date.now()}_${Math.random()}`,
      productRef,
      productDescription,
      dateTime,
      netUnit,
      unitsSold: units,
      totalAmount,
      discount: 0, // Always 0 as mentioned in requirements
      branch: branch
    };
  }

  private isBranchTotal(line: string): boolean {
    return line.includes('Grand Total') || line.includes('Terminal Total');
  }

  private parseBranchTotal(): { name: 'MAINSHOP' | 'SHOP2'; grandTotal: number; terminalTotal: number } | null {
    if (!this.currentBranch) return null;

    let grandTotal = 0;
    let terminalTotal = 0;

    // Look for Grand Total line
    const grandTotalLine = this.lines[this.currentLineIndex];
    if (grandTotalLine.includes('Grand Total')) {
      const totalMatch = grandTotalLine.match(/(\d{1,3}(?:,\d{3})*)\/=/g);
      if (totalMatch && totalMatch.length > 0) {
        grandTotal = this.parseAmount(totalMatch[totalMatch.length - 1]);
      }
    }

    // Look for Terminal Total line (next line)
    this.currentLineIndex++;
    if (this.currentLineIndex < this.lines.length) {
      const terminalTotalLine = this.lines[this.currentLineIndex];
      if (terminalTotalLine.includes('Terminal Total')) {
        const totalMatch = terminalTotalLine.match(/(\d{1,3}(?:,\d{3})*)\/=/g);
        if (totalMatch && totalMatch.length > 0) {
          terminalTotal = this.parseAmount(totalMatch[totalMatch.length - 1]);
        }
      }
    }

    this.currentLineIndex++;
    return {
      name: this.currentBranch,
      grandTotal,
      terminalTotal
    };
  }

  private parseAmount(amountStr: string): number {
    // Remove currency formatting: "1,695/=" -> 1695
    return parseInt(amountStr.replace(/[,\/=]/g, '')) || 0;
  }

  // Utility method to validate the parsed data
  static validateTransactions(transactions: ParsedSalesTransaction[]): {
    valid: ParsedSalesTransaction[];
    invalid: Array<{ transaction: ParsedSalesTransaction; errors: string[] }>;
  } {
    const valid: ParsedSalesTransaction[] = [];
    const invalid: Array<{ transaction: ParsedSalesTransaction; errors: string[] }> = [];

    transactions.forEach(transaction => {
      const errors: string[] = [];

      if (!transaction.productRef) errors.push('Missing product reference');
      if (!transaction.productDescription) errors.push('Missing product description');
      if (!transaction.dateTime) errors.push('Missing date/time');
      if (transaction.netUnit <= 0) errors.push('Invalid net unit price');
      if (transaction.unitsSold <= 0) errors.push('Invalid units sold');
      if (transaction.totalAmount <= 0) errors.push('Invalid total amount');
      if (!['MAINSHOP', 'SHOP2'].includes(transaction.branch)) errors.push('Invalid branch');

      // Validate date format
      try {
        const date = new Date(transaction.dateTime);
        if (isNaN(date.getTime())) {
          errors.push('Invalid date format');
        }
      } catch {
        errors.push('Invalid date format');
      }

      if (errors.length === 0) {
        valid.push(transaction);
      } else {
        invalid.push({ transaction, errors });
      }
    });

    return { valid, invalid };
  }

  // Generate summary statistics
  static generateSummary(transactions: ParsedSalesTransaction[]): {
    totalTransactions: number;
    totalRevenue: number;
    uniqueProducts: number;
    branchBreakdown: Record<string, { transactions: number; revenue: number; units: number }>;
    productBreakdown: Array<{ productRef: string; description: string; revenue: number; units: number; transactions: number }>;
  } {
    const branchBreakdown: Record<string, { transactions: number; revenue: number; units: number }> = {};
    const productMap = new Map<string, { description: string; revenue: number; units: number; transactions: number }>();

    transactions.forEach(transaction => {
      // Branch breakdown
      if (!branchBreakdown[transaction.branch]) {
        branchBreakdown[transaction.branch] = { transactions: 0, revenue: 0, units: 0 };
      }
      branchBreakdown[transaction.branch].transactions++;
      branchBreakdown[transaction.branch].revenue += transaction.totalAmount;
      branchBreakdown[transaction.branch].units += transaction.unitsSold;

      // Product breakdown
      if (!productMap.has(transaction.productRef)) {
        productMap.set(transaction.productRef, {
          description: transaction.productDescription,
          revenue: 0,
          units: 0,
          transactions: 0
        });
      }
      const product = productMap.get(transaction.productRef)!;
      product.revenue += transaction.totalAmount;
      product.units += transaction.unitsSold;
      product.transactions++;
    });

    const productBreakdown = Array.from(productMap.entries()).map(([productRef, data]) => ({
      productRef,
      description: data.description,
      revenue: data.revenue,
      units: data.units,
      transactions: data.transactions
    }));

    return {
      totalTransactions: transactions.length,
      totalRevenue: transactions.reduce((sum, t) => sum + t.totalAmount, 0),
      uniqueProducts: productMap.size,
      branchBreakdown,
      productBreakdown: productBreakdown.sort((a, b) => b.revenue - a.revenue)
    };
  }
}