'use client';

import React, { useState, useEffect, useRef } from 'react';
import { enhancedBarcodeService, BarcodeItem, BarcodeStats, CreateBarcodeItemInput } from '../../../../lib/firebase/enhanced-barcode';
import BarcodeService, { CodeType, BarcodeFormat } from '../../../../lib/services/barcode-service';
import { authService } from '../../../../lib/firebase/auth';
import { EnhancedSupplierService } from '../../../../lib/firebase/enhanced-supplier';
import { hrService } from '../../../../lib/services/hr-service';
import { QrCode, Plus, XCircle, BarChart3, Package, CheckCircle, Activity, Printer, Eye, Search } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Timestamp } from 'firebase/firestore';

export default function BarcodePage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BarcodeItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; }[]>([]);
  const [barcodeItems, setBarcodeItems] = useState<BarcodeItem[]>([]);
  const [stats, setStats] = useState<BarcodeStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printSettings, setPrintSettings] = useState({
    paperWidth: 50.8,
    paperHeight: 25.4
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Form State
  const [newItem, setNewItem] = useState({
    itemName: '',
    category: '',
    supplierName: '',
    receivedDate: new Date().toISOString().split('T')[0],
    codeType: 'barcode' as CodeType,
    barcodeFormat: 'CODE128' as BarcodeFormat,
    printSettings: {
      width: 50.8,
      height: 25.4,
      labelSize: '2"×1"',
      showText: true,
      fontSize: 12,
      margin: 2,
      paperWidth: 50.8,  // in mm
      paperHeight: 25.4  // in mm
    },
    notes: ''
  });

  const supplierService = new EnhancedSupplierService();

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    loadStats();
    loadSuppliers();
    loadBarcodeItems();
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await enhancedBarcodeService.getBarcodeStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      // Get all suppliers and filter for active ones client-side to avoid index requirement
      const allSuppliers = await supplierService.getAll();
      const activeSuppliers = allSuppliers
        .filter(supplier => supplier.status === 'Active')
        .sort((a, b) => a.supplierName.localeCompare(b.supplierName))
        .map(supplier => ({ id: supplier.id, name: supplier.supplierName }));
      setSuppliers(activeSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadBarcodeItems = async () => {
    try {
      const items = await enhancedBarcodeService.getRecentItems(30); // Get items from last 30 days
      
      // Check for items without barcode images and regenerate them
      const itemsWithImages = await Promise.all(
        items.map(async (item) => {
          if (!item.codeImageUrl) {
            try {
              let newImageUrl: string;
              if (item.codeType === 'barcode') {
                newImageUrl = BarcodeService.generateBarcodeSVG(
                  item.codeValue, 
                  item.barcodeFormat, 
                  item.printSettings
                );
              } else {
                newImageUrl = await BarcodeService.generateQRCodeSVG(
                  item.codeValue, 
                  item.printSettings
                );
              }
              return { ...item, codeImageUrl: newImageUrl };
            } catch (error) {
              console.error('Error regenerating barcode for item:', item.id, error);
              return item;
            }
          }
          return item;
        })
      );
      
      setBarcodeItems(itemsWithImages);
    } catch (error) {
      console.error('Error loading barcode items:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadStats(), loadSuppliers(), loadBarcodeItems()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert('Failed to refresh data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewItem = (item: BarcodeItem) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handlePrintClick = (item: BarcodeItem) => {
    setSelectedItem(item);
    setPrintSettings({
      paperWidth: 50.8, // Default paper width
      paperHeight: 25.4 // Default paper height
    });
    setShowPrintModal(true);
  };

  const handlePrintItem = async (item: BarcodeItem, customPrintSettings?: { paperWidth: number; paperHeight: number }) => {
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to print barcodes');
        return;
      }

      // Get paper dimensions (convert mm to pixels for display, assuming 96 DPI)
      const paperWidthPx = (customPrintSettings?.paperWidth || printSettings.paperWidth) * 3.78; // mm to px
      const paperHeightPx = (customPrintSettings?.paperHeight || printSettings.paperHeight) * 3.78; // mm to px
      const paperWidthMm = customPrintSettings?.paperWidth || printSettings.paperWidth;
      const paperHeightMm = customPrintSettings?.paperHeight || printSettings.paperHeight;
      
      // Calculate optimal sizes based on paper dimensions
      const isLandscape = paperWidthMm > paperHeightMm;
      const maxCodeWidth = Math.min(paperWidthPx * 0.8, 400);
      const maxCodeHeight = Math.min(paperHeightPx * 0.5, 200);

      // Pre-generate QR code for reliable printing
      let qrCodeContent = '';
      if (item.codeType === 'qrcode') {
        try {
          const qrSize = Math.min(paperWidthMm * 0.6 * 3.78, paperHeightMm * 0.4 * 3.78, 120); // Smaller QR code
          const qrDataUrl = await QRCode.toDataURL(item.codeValue, {
            width: qrSize,
            margin: Math.max(1, paperWidthMm / 40),
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          qrCodeContent = `<img src="${qrDataUrl}" style="width: ${qrSize}px; height: ${qrSize}px; display: block; margin: 0 auto;" alt="QR Code">`;
        } catch (error) {
          console.error('Error generating QR code:', error);
          qrCodeContent = '<div style="color: red; padding: 5px; text-align: center; font-size: 10px;">Error generating QR code</div>';
        }
      }

      // Generate the barcode/QR code directly in the print window
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Code</title>
          <style>
            @page {
              size: ${paperWidthMm}mm ${paperHeightMm}mm;
              margin: 1mm;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              width: ${paperWidthMm}mm;
              height: ${paperHeightMm}mm;
              overflow: hidden;
              background: white;
              font-family: Arial, sans-serif;
            }
            body {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 1mm;
            }
            .code-container {
              text-align: center;
              background: white;
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              max-width: ${paperWidthMm - 2}mm;
              max-height: ${paperHeightMm - 2}mm;
            }
            .item-name {
              font-size: ${Math.max(6, Math.min(paperWidthMm / 6, 14))}px;
              font-weight: bold;
              margin-bottom: ${Math.max(1, paperHeightMm / 25)}mm;
              color: #333;
              text-align: center;
              word-wrap: break-word;
              max-width: 95%;
              line-height: 1.2;
            }
            .code-image {
              margin: ${Math.max(0.5, paperHeightMm / 40)}mm auto;
              display: block;
              max-width: ${Math.min(paperWidthMm * 0.7, maxCodeWidth * 0.8)}px;
              max-height: ${Math.min(paperHeightMm * 0.5, maxCodeHeight * 0.8)}px;
            }
            canvas {
              display: block;
              margin: ${Math.max(0.5, paperHeightMm / 40)}mm auto;
              max-width: ${Math.min(paperWidthMm * 0.7, maxCodeWidth * 0.8)}px;
              max-height: ${Math.min(paperHeightMm * 0.5, maxCodeHeight * 0.8)}px;
            }
            .code-value {
              font-family: monospace;
              font-size: ${Math.max(4, Math.min(paperWidthMm / 8, 10))}px;
              font-weight: bold;
              margin-top: ${Math.max(0.5, paperHeightMm / 40)}mm;
              color: #666;
              letter-spacing: 0.5px;
              text-align: center;
              word-wrap: break-word;
              max-width: 95%;
              line-height: 1.1;
            }
            @media print {
              @page {
                size: ${paperWidthMm}mm ${paperHeightMm}mm;
                margin: 0;
              }
              html, body { 
                margin: 0 !important; 
                padding: 1mm !important;
                width: ${paperWidthMm}mm !important;
                height: ${paperHeightMm}mm !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                page-break-after: avoid !important;
              }
              .code-container {
                page-break-inside: avoid !important;
                max-width: ${paperWidthMm - 2}mm !important;
                max-height: ${paperHeightMm - 2}mm !important;
              }
              .no-print { 
                display: none !important; 
              }
              .code-image, canvas, img {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                page-break-inside: avoid !important;
              }
            }
            @media screen {
              body {
                border: 1px solid #ccc;
                margin: 20px auto;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="code-container">
            <div class="item-name">${item.itemName}</div>
            <div id="codeContainer">
              ${item.codeType === 'qrcode' ? qrCodeContent : ''}
            </div>
            <div class="code-value">${item.codeValue}</div>
          </div>
          <div class="no-print" style="position: fixed; top: 5px; right: 5px; z-index: 1000; background: rgba(255,255,255,0.9); padding: 3px; border-radius: 3px;">
            <button onclick="window.print()" style="padding: 6px 12px; background: #7c3aed; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 3px; font-size: 11px;">Print</button>
            <button onclick="window.close()" style="padding: 6px 12px; background: #6b7280; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Close</button>
          </div>
          
          <script>
            window.onload = function() {
              const container = document.getElementById('codeContainer');
              const codeType = '${item.codeType}';
              const codeValue = '${item.codeValue}';
              const barcodeFormat = '${item.barcodeFormat || 'CODE128'}';
              const paperWidth = ${paperWidthMm};
              const paperHeight = ${paperHeightMm};
              
              // Only generate barcode if it's a barcode type (QR code is pre-generated)
              if (codeType === 'barcode') {
                const canvas = document.createElement('canvas');
                // Smaller barcode dimensions to fit on one page
                const barcodeWidth = Math.max(1, Math.min(3, paperWidth / 30));
                const barcodeHeight = Math.max(25, Math.min(60, paperHeight * 1.2));
                
                try {
                  JsBarcode(canvas, codeValue, {
                    format: barcodeFormat,
                    width: barcodeWidth,
                    height: barcodeHeight,
                    displayValue: false,
                    margin: Math.max(2, paperWidth / 25),
                    background: '#ffffff',
                    lineColor: '#000000'
                  });
                  
                  // Ensure canvas doesn't exceed container size
                  const maxWidth = paperWidth * 0.7 * 3.78; // mm to px
                  const maxHeight = paperHeight * 0.5 * 3.78; // mm to px
                  
                  if (canvas.width > maxWidth) {
                    canvas.style.width = maxWidth + 'px';
                  }
                  if (canvas.height > maxHeight) {
                    canvas.style.height = maxHeight + 'px';
                  }
                  
                  container.appendChild(canvas);
                } catch (error) {
                  console.error('Barcode generation error:', error);
                  container.innerHTML = '<div style="color: red; padding: 5px; font-size: 10px;">Error generating barcode</div>';
                }
              }
              
              console.log('Page loaded, code type:', codeType);
              if (codeType === 'qrcode') {
                console.log('QR code content loaded');
              }
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Record the print activity
      // Create proper print settings object
      const fullPrintSettings = {
        width: customPrintSettings?.paperWidth || printSettings.paperWidth,
        height: customPrintSettings?.paperHeight || printSettings.paperHeight,
        labelSize: '2"×1"',
        showText: true,
        fontSize: 12,
        margin: 2
      };

      await enhancedBarcodeService.recordPrint(
        item.id,
        currentUser?.employee?.employeeId || 'EMP001',
        1,
        fullPrintSettings
      );

      // Record scan for shift tracking
      if (currentUser?.employee?.id) {
        try {
          const scanResult = hrService.recordShiftScan(currentUser.employee.id);
          console.log('Barcode print scan recorded:', scanResult);
        } catch (scanError) {
          console.log('Scan tracking not active for this user:', scanError);
        }
      }

      // Refresh items to update print history
      loadBarcodeItems();
      
    } catch (error) {
      console.error('Error printing item:', error);
      alert('Failed to print barcode. Please try again.');
    }
  };

  const handleAddItem = async () => {
    try {
      setIsSubmitting(true);
      
      // Generate the code value
      const codeValue = BarcodeService.generateFormatSpecificCode(newItem.itemName, newItem.category, newItem.barcodeFormat);
      
      const itemToAdd: CreateBarcodeItemInput = {
        itemName: newItem.itemName,
        category: newItem.category,
        supplierName: newItem.supplierName,
        receivedDate: new Date(newItem.receivedDate),
        codeType: newItem.codeType,
        barcodeFormat: newItem.barcodeFormat,
        printSettings: {
          ...newItem.printSettings,
          labelSize: newItem.printSettings.labelSize
        },
        codeValue: codeValue,
        codeImageUrl: '',
        notes: newItem.notes || '',
        generatedBy: currentUser?.uid || ''
      };

      await enhancedBarcodeService.createBarcodeItem(itemToAdd);
      
      // Record scan for shift tracking
      if (currentUser?.employee?.id) {
        try {
          const scanResult = hrService.recordShiftScan(currentUser.employee.id);
          console.log('Barcode creation scan recorded:', scanResult);
        } catch (scanError) {
          console.log('Scan tracking not active for this user:', scanError);
        }
      }
      
      alert('Barcode item added successfully!');
      loadBarcodeItems();
      
      // Reset form and close modal
      setNewItem({
        itemName: '',
        category: '',
        supplierName: '',
        receivedDate: new Date().toISOString().split('T')[0],
        codeType: 'barcode',
        barcodeFormat: 'CODE128',
        printSettings: {
          width: 50.8,
          height: 25.4,
          labelSize: '2"×1"',
          showText: true,
          fontSize: 12,
          margin: 2,
          paperWidth: 50.8,  // in mm
          paperHeight: 25.4  // in mm
        },
        notes: ''
      });
      setShowAddModal(false);
      loadStats();
        
    } catch (error) {
      console.error('Error adding barcode item:', error);
      alert('Failed to add barcode item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelSizes = [
    { name: '1"×1"', width: 25.4, height: 25.4 },
    { name: '2"×1"', width: 50.8, height: 25.4 },
    { name: '3"×1"', width: 76.2, height: 25.4 },
    { name: '4"×2"', width: 101.6, height: 50.8 },
    { name: '4"×3"', width: 101.6, height: 76.2 }
  ];
  const categories = ['Electronics', 'Furniture', 'Stationery', 'Equipment', 'Supplies', 'Other'];
  const barcodeFormats: BarcodeFormat[] = ['CODE128', 'CODE39', 'EAN13', 'UPC', 'ITF14'];

  // Filter barcode items based on search query
  const filteredBarcodeItems = barcodeItems.filter(item => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      item.itemName.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.codeValue.toLowerCase().includes(query) ||
      (item.supplierName && item.supplierName.toLowerCase().includes(query)) ||
      (item.itemDescription && item.itemDescription.toLowerCase().includes(query)) ||
      item.codeType.toLowerCase().includes(query) ||
      (item.barcodeFormat && item.barcodeFormat.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <QrCode className="w-8 h-8 mr-3 text-purple-600" />
                Barcode & QR Code Manager
              </h1>
              <p className="text-gray-600 mt-2">
                Generate and manage codes for items without existing identification
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search codes by name, category, code value, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XCircle className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Showing {filteredBarcodeItems.length} of {barcodeItems.length} items
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <QrCode className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Barcode System Ready
            </h2>
            <p className="text-gray-600">
              The barcode management system is ready for use. Generate barcodes and QR codes 
              for items delivered without existing identification codes.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">Generate Codes</h3>
                <p className="text-sm text-purple-700">
                  Create barcodes or QR codes for new items
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Multiple Formats</h3>
                <p className="text-sm text-blue-700">
                  Support for CODE128, QR, and other formats
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Print Ready</h3>
                <p className="text-sm text-green-700">
                  High-quality printing in various label sizes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Items List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Recent Barcode Items</h3>
              <span className="text-sm text-gray-500">{barcodeItems.length} items</span>
            </div>
          </div>
          
          <div className="p-6">
            {filteredBarcodeItems.length === 0 ? (
              <div className="text-center py-12">
                <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                {searchQuery ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                    <p className="text-gray-600 mb-4">
                      No barcode items match your search for "{searchQuery}"
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No barcode items yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first barcode or QR code to get started
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center mx-auto"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Item
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBarcodeItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 truncate">{item.itemName}</h4>
                        <p className="text-sm text-gray-500">{item.category}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    
                    {/* Barcode Image */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 min-h-[80px] flex items-center justify-center">
                      <BarcodeDisplay item={item} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Code:</span>
                        <span className="font-mono text-xs">{item.codeValue}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Type:</span>
                        <span className="uppercase text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {item.codeType === 'barcode' ? item.barcodeFormat : 'QR'}
                        </span>
                      </div>
                      {item.supplierName && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Supplier:</span>
                          <span className="text-xs truncate max-w-[120px]">{item.supplierName}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Created:</span>
                        <span className="text-xs">{item.createdAt.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-2">
                      <button 
                        onClick={() => handlePrintClick(item)}
                        className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Print
                      </button>
                      <button 
                        onClick={() => handleViewItem(item)}
                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">Add Barcode Item</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Form Section */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={newItem.itemName}
                        onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter item name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category *
                      </label>
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select category</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplier Name
                      </label>
                      <select
                        value={newItem.supplierName}
                        onChange={(e) => setNewItem(prev => ({ ...prev, supplierName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select supplier</option>
                        {suppliers.map(supplier => (
                          <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Received Date
                      </label>
                      <input
                        type="date"
                        value={newItem.receivedDate}
                        onChange={(e) => setNewItem(prev => ({ ...prev, receivedDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code Type
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="codeType"
                            value="barcode"
                            checked={newItem.codeType === 'barcode'}
                            onChange={(e) => setNewItem(prev => ({ ...prev, codeType: e.target.value as CodeType }))}
                            className="mr-2"
                          />
                          Barcode
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="codeType"
                            value="qrcode"
                            checked={newItem.codeType === 'qrcode'}
                            onChange={(e) => setNewItem(prev => ({ ...prev, codeType: e.target.value as CodeType }))}
                            className="mr-2"
                          />
                          QR Code
                        </label>
                      </div>
                    </div>

                    {newItem.codeType === 'barcode' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Barcode Format
                        </label>
                        <select
                          value={newItem.barcodeFormat}
                          onChange={(e) => setNewItem(prev => ({ ...prev, barcodeFormat: e.target.value as BarcodeFormat }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          {barcodeFormats.map(format => (
                            <option key={format} value={format}>{format}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Label Size</label>
                      <select
                        value={newItem.printSettings.labelSize}
                        onChange={(e) => {
                          const selectedSize = labelSizes.find(size => size.name === e.target.value);
                          if (selectedSize) {
                            setNewItem(prev => ({
                              ...prev,
                              printSettings: {
                                ...prev.printSettings,
                                labelSize: selectedSize.name,
                                width: selectedSize.width,
                                height: selectedSize.height,
                                paperWidth: selectedSize.width,
                                paperHeight: selectedSize.height
                              }
                            }));
                          }
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        {labelSizes.map(size => (
                          <option key={size.name} value={size.name}>{size.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Paper Size */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paper Width (mm)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="300"
                          step="0.1"
                          value={newItem.printSettings.paperWidth}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            printSettings: {
                              ...prev.printSettings,
                              paperWidth: parseFloat(e.target.value) || 50.8
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="50.8"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paper Height (mm)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="300"
                          step="0.1"
                          value={newItem.printSettings.paperHeight}
                          onChange={(e) => setNewItem(prev => ({
                            ...prev,
                            printSettings: {
                              ...prev.printSettings,
                              paperHeight: parseFloat(e.target.value) || 25.4
                            }
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="25.4"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes
                      </label>
                      <textarea
                        value={newItem.notes}
                        onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                        placeholder="Enter any additional notes"
                      />
                    </div>
                  </div>

                  {/* Preview Section */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Preview</h4>
                      <div className="bg-gray-50 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                        {newItem.itemName && newItem.category ? (
                          <div className="text-center">
                            <PreviewDisplay 
                              codeValue={BarcodeService.generateFormatSpecificCode(newItem.itemName, newItem.category, newItem.barcodeFormat)}
                              codeType={newItem.codeType}
                              barcodeFormat={newItem.barcodeFormat}
                            />
                            <p className="text-sm text-gray-600 mt-2">
                              Code: {BarcodeService.generateFormatSpecificCode(newItem.itemName, newItem.category, newItem.barcodeFormat)}
                            </p>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500">
                            <QrCode className="w-16 h-16 mx-auto mb-2 opacity-50" />
                            <p>Enter item name and category to see preview</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-2">Print Settings</h5>
                      <div className="space-y-2 text-sm text-blue-800">
                        <p><strong>Size:</strong> {newItem.printSettings.labelSize}</p>
                        <p><strong>Dimensions:</strong> {newItem.printSettings.width}mm × {newItem.printSettings.height}mm</p>
                        <p><strong>Show Text:</strong> {newItem.printSettings.showText ? 'Yes' : 'No'}</p>
                        <p><strong>Font Size:</strong> {newItem.printSettings.fontSize}pt</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddItem}
                    disabled={!newItem.itemName || !newItem.category}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Item Modal */}
        {showViewModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">Barcode Item Details</h3>
                <button 
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Item Information */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Item Information</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Item Name</label>
                          <p className="text-gray-900">{selectedItem.itemName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Category</label>
                          <p className="text-gray-900">{selectedItem.category}</p>
                        </div>
                        {selectedItem.supplierName && (
                          <div>
                            <label className="block text-sm font-medium text-gray-500">Supplier</label>
                            <p className="text-gray-900">{selectedItem.supplierName}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Status</label>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            selectedItem.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedItem.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Code Information</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Code Value</label>
                          <p className="font-mono text-gray-900 bg-gray-100 p-2 rounded">{selectedItem.codeValue}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Code Type</label>
                          <p className="text-gray-900">
                            {selectedItem.codeType === 'barcode' ? `Barcode (${selectedItem.barcodeFormat})` : 'QR Code'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barcode Display */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Barcode Preview</h4>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 text-center">
                        <BarcodeDisplay item={selectedItem} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handlePrintItem(selectedItem);
                      setShowViewModal(false);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print This Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Settings Modal */}
        {showPrintModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Print Settings</h2>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedItem.itemName}</h3>
                  <p className="text-sm text-gray-600">Configure paper size for printing</p>
                </div>

                {/* Paper Size Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paper Width (mm)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="0.1"
                      value={printSettings.paperWidth}
                      onChange={(e) => setPrintSettings(prev => ({
                        ...prev,
                        paperWidth: parseFloat(e.target.value) || 50.8
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="50.8"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paper Height (mm)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      step="0.1"
                      value={printSettings.paperHeight}
                      onChange={(e) => setPrintSettings(prev => ({
                        ...prev,
                        paperHeight: parseFloat(e.target.value) || 25.4
                      }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="25.4"
                    />
                  </div>
                </div>

                {/* Common Paper Sizes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Sizes
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: '1"×1"', width: 25.4, height: 25.4 },
                      { name: '2"×1"', width: 50.8, height: 25.4 },
                      { name: '3"×1"', width: 76.2, height: 25.4 },
                      { name: '4"×2"', width: 101.6, height: 50.8 },
                      { name: '4"×3"', width: 101.6, height: 76.2 },
                      { name: 'A4', width: 210, height: 297 }
                    ].map(size => (
                      <button
                        key={size.name}
                        onClick={() => setPrintSettings({
                          paperWidth: size.width,
                          paperHeight: size.height
                        })}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded transition-colors"
                      >
                        {size.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Print Preview</h4>
                  <p className="text-xs text-gray-600">
                    Paper: {printSettings.paperWidth}mm × {printSettings.paperHeight}mm
                  </p>
                  <p className="text-xs text-gray-600">
                    Layout: {printSettings.paperWidth > printSettings.paperHeight ? 'Landscape' : 'Portrait'}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await handlePrintItem(selectedItem, printSettings);
                      setShowPrintModal(false);
                    }}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Barcode Display Component
const BarcodeDisplay = ({ item }: { item: BarcodeItem }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateBarcode = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (item.codeType === 'barcode') {
          // Generate barcode
          JsBarcode(canvas, item.codeValue, {
            format: item.barcodeFormat || 'CODE128',
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 12,
            margin: 10,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } else {
          // Generate QR Code using toDataURL for better reliability
          const qrDataUrl = await QRCode.toDataURL(item.codeValue, {
            width: 150,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });

          // Create image and draw to canvas
          const img = new Image();
          img.onload = () => {
            // Clear canvas again
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate center position
            const x = (canvas.width - 150) / 2;
            const y = (canvas.height - 150) / 2;
            
            ctx.drawImage(img, x, y, 150, 150);
          };
          img.onerror = () => {
            console.error('Failed to load QR code image');
            // Show error message on canvas
            ctx.fillStyle = '#ff0000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('QR Code Error', canvas.width / 2, canvas.height / 2);
          };
          img.src = qrDataUrl;
        }
      } catch (error) {
        console.error('Error generating barcode in canvas:', error);
        // Show error message on canvas
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error generating code', canvas.width / 2, canvas.height / 2);
      }
    };

    generateBarcode();
  }, [item.codeValue, item.codeType, item.barcodeFormat]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={150}
      className="max-w-full h-auto border border-gray-200 rounded"
      style={{ background: '#ffffff' }}
    />
  );
};

// Preview Display Component for Add Modal
const PreviewDisplay = ({ codeValue, codeType, barcodeFormat }: { 
  codeValue: string; 
  codeType: CodeType; 
  barcodeFormat: BarcodeFormat;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generatePreview = async () => {
      if (!canvasRef.current || !codeValue) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (codeType === 'barcode') {
          // Generate barcode
          JsBarcode(canvas, codeValue, {
            format: barcodeFormat,
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 15,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } else {
          // Generate QR Code using toDataURL for better reliability
          const qrDataUrl = await QRCode.toDataURL(codeValue, {
            width: 160,
            margin: 3,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });

          // Create image and draw to canvas
          const img = new Image();
          img.onload = () => {
            // Clear canvas again
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate center position
            const x = (canvas.width - 160) / 2;
            const y = (canvas.height - 160) / 2;
            
            ctx.drawImage(img, x, y, 160, 160);
          };
          img.onerror = () => {
            console.error('Failed to load QR code preview');
            // Show error message on canvas
            ctx.fillStyle = '#ff0000';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('QR Preview Error', canvas.width / 2, canvas.height / 2);
          };
          img.src = qrDataUrl;
        }
      } catch (error) {
        console.error('Error generating preview:', error);
        // Show error message on canvas
        ctx.fillStyle = '#ff0000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error generating preview', canvas.width / 2, canvas.height / 2);
      }
    };

    generatePreview();
  }, [codeValue, codeType, barcodeFormat]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={180}
      className="max-w-full h-auto border border-gray-200 rounded"
      style={{ background: '#ffffff' }}
    />
  );
}; 