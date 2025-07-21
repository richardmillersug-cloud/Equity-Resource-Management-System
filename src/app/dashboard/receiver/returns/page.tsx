'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedReturnNoteService, ReturnNote, ReturnItem, ReturnNoteStats, RETURN_REASONS, RETURN_STATUSES } from '../../../../lib/firebase/enhanced-return-note';
import { EnhancedSupplierService } from '../../../../lib/firebase/enhanced-supplier';
import { Package, Plus, Search, RefreshCw, Calendar, CheckCircle, XCircle, AlertCircle, Clock, Edit, Trash2, Download, FileText, FileSpreadsheet, File, Filter, AlertTriangle, ArrowLeft, Eye, Truck } from 'lucide-react';
import { authService } from '../../../../lib/firebase/auth';
import { Timestamp } from 'firebase/firestore';

const enhancedReturnNoteService = new EnhancedReturnNoteService();
const supplierService = new EnhancedSupplierService();

export default function ReturnNotesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [returnNotes, setReturnNotes] = useState<ReturnNote[]>([]);
  const [stats, setStats] = useState<ReturnNoteStats | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturnNote, setSelectedReturnNote] = useState<ReturnNote | null>(null);

  // Return Note Form State
  const [newReturnNote, setNewReturnNote] = useState({
    supplierId: '',
    supplierName: '',
    returnDate: new Date().toISOString().split('T')[0],
    expectedPickupDate: '',
    reason: '',
    notes: '',
    items: [] as ReturnItem[]
  });

  // Item Form State
  const [newItem, setNewItem] = useState({
    itemName: '',
    itemDescription: '',
    category: '',
    quantity: 1,
    unit: 'pcs',
    unitPrice: 0,
    reason: '',
    batchNumber: '',
    expiryDate: '',
    invoiceNumber: '',
    notes: ''
  });

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReturnNote, setEditingReturnNote] = useState<any>(null);
  const [isViewMode, setIsViewMode] = useState(true);

  // Validation Functions
  const validateUser = (): { isValid: boolean; message: string } => {
    if (!currentUser) {
      return { isValid: false, message: 'User not authenticated. Please refresh the page and try again.' };
    }
    if (!currentUser.uid) {
      return { isValid: false, message: 'Invalid user session. Please log in again.' };
    }
    return { isValid: true, message: '' };
  };

  const validateSupplier = (): { isValid: boolean; message: string } => {
    if (!newReturnNote.supplierId) {
      return { isValid: false, message: 'Please select a supplier before proceeding.' };
    }
    if (!newReturnNote.supplierName) {
      return { isValid: false, message: 'Invalid supplier selection. Please select again.' };
    }
    return { isValid: true, message: '' };
  };

  const validateReturnNote = (): { isValid: boolean; message: string } => {
    // Check supplier
    const supplierValidation = validateSupplier();
    if (!supplierValidation.isValid) {
      return supplierValidation;
    }

    // Check return date
    if (!newReturnNote.returnDate) {
      return { isValid: false, message: 'Please select a return date.' };
    }

    const returnDate = new Date(newReturnNote.returnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (returnDate > today) {
      return { isValid: false, message: 'Return date cannot be in the future.' };
    }

    // Check return reason
    if (!newReturnNote.reason) {
      return { isValid: false, message: 'Please select a return reason.' };
    }

    // Check items
    if (newReturnNote.items.length === 0) {
      return { isValid: false, message: 'Please add at least one item to the return note.' };
    }

    // Validate each item
    for (let i = 0; i < newReturnNote.items.length; i++) {
      const item = newReturnNote.items[i];
      const itemValidation = validateItem(item);
      if (!itemValidation.isValid) {
        return { isValid: false, message: `Item ${i + 1}: ${itemValidation.message}` };
      }
    }

    // Check expected pickup date if provided
    if (newReturnNote.expectedPickupDate) {
      const expectedDate = new Date(newReturnNote.expectedPickupDate);
      if (expectedDate <= returnDate) {
        return { isValid: false, message: 'Expected pickup date must be after the return date.' };
      }
    }

    return { isValid: true, message: '' };
  };

  const validateItem = (item: any): { isValid: boolean; message: string } => {
    if (!item.itemName || !item.itemName.trim()) {
      return { isValid: false, message: 'Item name is required.' };
    }

    if (item.itemName.length > 100) {
      return { isValid: false, message: 'Item name must be less than 100 characters.' };
    }

    if (!item.reason) {
      return { isValid: false, message: 'Return reason is required for each item.' };
    }

    if (!item.quantity || item.quantity <= 0) {
      return { isValid: false, message: 'Quantity must be greater than 0.' };
    }

    if (item.quantity > 10000) {
      return { isValid: false, message: 'Quantity cannot exceed 10,000 units.' };
    }

    if (!item.unitPrice || item.unitPrice < 0) {
      return { isValid: false, message: 'Unit price must be greater than or equal to 0.' };
    }

    if (item.unitPrice > 1000000) {
      return { isValid: false, message: 'Unit price cannot exceed $1,000,000.' };
    }

    if (!item.unit) {
      return { isValid: false, message: 'Unit is required.' };
    }

    // Validate expiry date if provided
    if (item.expiryDate) {
      const expiryDate = new Date(item.expiryDate);
      const today = new Date();
      
      if (item.reason === 'Expired goods' && expiryDate > today) {
        return { isValid: false, message: 'For expired goods, expiry date must be in the past.' };
      }
      
      if (item.reason === 'Short expiry dates') {
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry > 30) {
          return { isValid: false, message: 'For short expiry dates, expiry should be within 30 days.' };
        }
      }
    }

    // Validate batch number format if provided
    if (item.batchNumber && !/^[A-Za-z0-9\-_]{1,20}$/.test(item.batchNumber)) {
      return { isValid: false, message: 'Batch number can only contain letters, numbers, hyphens, and underscores (max 20 characters).' };
    }

    // Validate invoice number format if provided
    if (item.invoiceNumber && !/^[A-Za-z0-9\-_]{1,30}$/.test(item.invoiceNumber)) {
      return { isValid: false, message: 'Invoice number can only contain letters, numbers, hyphens, and underscores (max 30 characters).' };
    }

    return { isValid: true, message: '' };
  };

  const validateNewItem = (): { isValid: boolean; message: string } => {
    return validateItem(newItem);
  };

  const validateStatusUpdate = (returnNote: ReturnNote, newStatus: string): { isValid: boolean; message: string } => {
    const userValidation = validateUser();
    if (!userValidation.isValid) {
      return userValidation;
    }

    // Status transition validation
    const validTransitions: { [key: string]: string[] } = {
      'draft': ['pending', 'cancelled'],
      'pending': ['approved', 'rejected'],
      'approved': ['picked_up', 'cancelled'],
      'picked_up': ['processed'],
      'processed': [], // Final state
      'rejected': [], // Final state
      'cancelled': [] // Final state
    };

    if (!validTransitions[returnNote.status]?.includes(newStatus)) {
      return { 
        isValid: false, 
        message: `Cannot change status from ${returnNote.status} to ${newStatus}. Invalid transition.` 
      };
    }

    // Business logic validation
    if (newStatus === 'approved' && returnNote.items.length === 0) {
      return { isValid: false, message: 'Cannot approve return note with no items.' };
    }

    if (newStatus === 'picked_up' && !returnNote.expectedPickupDate) {
      return { isValid: false, message: 'Expected pickup date must be set before marking as picked up.' };
    }

    return { isValid: true, message: '' };
  };

  const validateDelete = (returnNote: ReturnNote): { isValid: boolean; message: string } => {
    const userValidation = validateUser();
    if (!userValidation.isValid) {
      return userValidation;
    }

    // Only allow deletion of draft and pending return notes
    if (!['draft', 'pending'].includes(returnNote.status)) {
      return { 
        isValid: false, 
        message: `Cannot delete return note with status "${returnNote.status}". Only draft and pending return notes can be deleted.` 
      };
    }

    return { isValid: true, message: '' };
  };

  const showValidationError = (message: string) => {
    // Enhanced error display with better styling
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-md shadow-lg';
    errorDiv.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>
        <span class="font-medium">Validation Error:</span>
      </div>
      <p class="mt-1">${message}</p>
    `;
    document.body.appendChild(errorDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  };

  const showSuccess = (message: string) => {
    // Enhanced success display with better styling
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 max-w-md shadow-lg';
    successDiv.innerHTML = `
      <div class="flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
        </svg>
        <span class="font-medium">Success:</span>
      </div>
      <p class="mt-1">${message}</p>
    `;
    document.body.appendChild(successDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 3000);
  };

  const handleCreateReturnNoteClick = () => {
    const userValidation = validateUser();
    if (!userValidation.isValid) {
      showValidationError(userValidation.message);
      return;
    }

    // Check if suppliers are loaded
    if (suppliers.length === 0) {
      showValidationError('Suppliers are not loaded yet. Please wait a moment and try again.');
      return;
    }

    try {
      setShowAddModal(true);
    } catch (error) {
      console.error('Error opening return note modal:', error);
      showValidationError('Failed to open the return note form. Please try again.');
    }
  };



  const handleAddItemClick = () => {
    const userValidation = validateUser();
    if (!userValidation.isValid) {
      showValidationError(userValidation.message);
      return;
    }

    const supplierValidation = validateSupplier();
    if (!supplierValidation.isValid) {
      showValidationError(supplierValidation.message);
      return;
    }

    // Additional checks for add item process
    if (newReturnNote.items.length >= 50) {
      showValidationError('Maximum of 50 items allowed per return note. Please create a new return note for additional items.');
      return;
    }

    try {
      setShowItemModal(true);
    } catch (error) {
      console.error('Error opening add item modal:', error);
      showValidationError('Failed to open add item form. Please try again.');
    }
  };



  const handleUpdateReturnNote = async () => {
    try {
      setIsSubmitting(true);

      const validationResult = validateReturnNote();
      if (!validationResult.isValid) {
        showValidationError(validationResult.message);
        return;
      }

      const totalQuantity = newReturnNote.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = newReturnNote.items.reduce((sum, item) => sum + item.totalValue, 0);

      const updateData = {
        supplierId: newReturnNote.supplierId,
        supplierName: newReturnNote.supplierName,
        items: newReturnNote.items,
        totalQuantity,
        totalValue,
        returnDate: new Date(newReturnNote.returnDate),
        expectedPickupDate: newReturnNote.expectedPickupDate ? new Date(newReturnNote.expectedPickupDate) : undefined,
        reason: newReturnNote.reason,
        notes: newReturnNote.notes || '',
        updatedBy: currentUser.uid,
        updatedAt: new Date()
      };

      await enhancedReturnNoteService.updateReturnNote(editingReturnNote.id, updateData);
      showSuccess('Return note updated successfully!');

      // Reset and close
      setShowEditModal(false);
      setEditingReturnNote(null);
      setNewReturnNote({
        supplierId: '',
        supplierName: '',
        returnDate: new Date().toISOString().split('T')[0],
        expectedPickupDate: '',
        reason: '',
        notes: '',
        items: []
      });

      loadReturnNotes();
      loadStats();
    } catch (error) {
      console.error('Error updating return note:', error);
      showValidationError('Failed to update return note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setEditingReturnNote(null);
    setIsViewMode(true);
    
    // Reset form
    setNewReturnNote({
      supplierId: '',
      supplierName: '',
      returnDate: new Date().toISOString().split('T')[0],
      expectedPickupDate: '',
      reason: '',
      notes: '',
      items: []
    });
  };

  useEffect(() => {
    loadCurrentUser();
    loadSuppliers();
    loadReturnNotes();
    loadStats();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await supplierService.getActiveSuppliers();
      setSuppliers(suppliersData.map(supplier => ({
        id: supplier.id,
        name: supplier.supplierName
      })));
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadReturnNotes = async () => {
    try {
      const notes = await enhancedReturnNoteService.getAll([], { 
        orderBy: 'createdAt', 
        orderDirection: 'desc' 
      });
      setReturnNotes(notes);
    } catch (error) {
      console.error('Error loading return notes:', error);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await enhancedReturnNoteService.getReturnNoteStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Handler functions for modals





  const handleCreateReturnNote = async () => {
    try {
      setIsSubmitting(true);
      
      const userValidation = validateUser();
      if (!userValidation.isValid) {
        showValidationError(userValidation.message);
        return;
      }

      const returnNoteValidation = validateReturnNote();
      if (!returnNoteValidation.isValid) {
        showValidationError(returnNoteValidation.message);
        return;
      }

      const returnNoteData = {
        supplierId: newReturnNote.supplierId,
        supplierName: newReturnNote.supplierName,
        returnDate: Timestamp.fromDate(new Date(newReturnNote.returnDate)),
        expectedPickupDate: newReturnNote.expectedPickupDate ? Timestamp.fromDate(new Date(newReturnNote.expectedPickupDate)) : null,
        reason: newReturnNote.reason,
        notes: newReturnNote.notes,
        items: newReturnNote.items,
        status: 'draft',
        createdBy: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      if (editingReturnNote) {
        await enhancedReturnNoteService.update(editingReturnNote.id, returnNoteData);
        showSuccess('Return note updated successfully!');
        setEditingReturnNote(null);
      } else {
        await enhancedReturnNoteService.create(returnNoteData);
        showSuccess('Return note created successfully!');
      }

      // Reset form
      setNewReturnNote({
        supplierId: '',
        supplierName: '',
        returnDate: new Date().toISOString().split('T')[0],
        expectedPickupDate: '',
        reason: '',
        notes: '',
        items: []
      });

      setShowAddModal(false);
      loadReturnNotes();
      loadStats();

    } catch (error) {
      console.error('Error creating return note:', error);
      showValidationError('Failed to create return note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateReturnNoteStatus = async (id: string, status: string) => {
    try {
      await enhancedReturnNoteService.updateStatus(id, status);
      showSuccess(`Return note status updated to ${status}!`);
      loadReturnNotes();
      loadStats();
    } catch (error) {
      console.error('Error updating return note status:', error);
      showValidationError('Failed to update status. Please try again.');
    }
  };

  const handleUpdateItem = () => {
    const itemValidation = validateItem(newItem);
    if (!itemValidation.isValid) {
      showValidationError(itemValidation.message);
      return;
    }

    setNewReturnNote(prev => ({
      ...prev,
      items: prev.items.map((item, index) => 
        index === editingItemIndex 
          ? {
              ...newItem,
              expiryDate: newItem.expiryDate ? Timestamp.fromDate(new Date(newItem.expiryDate)) : null
            }
          : item
      )
    }));

    // Reset item form
    setNewItem({
      itemName: '',
      itemDescription: '',
      category: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      reason: '',
      batchNumber: '',
      expiryDate: '',
      invoiceNumber: '',
      notes: ''
    });

    setEditingItemIndex(-1);
    setShowItemModal(false);
  };

  const handleSubmitReturnNote = async () => {
    await handleCreateReturnNote();
  };

  const handleRefresh = async () => {
    const userValidation = validateUser();
    if (!userValidation.isValid) {
      showValidationError(userValidation.message);
      return;
    }

    try {
      await Promise.all([loadReturnNotes(), loadStats()]);
      showSuccess('Data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showValidationError('Failed to refresh data. Please check your connection and try again.');
    }
  };

  const handleViewReturnNote = (returnNote: ReturnNote) => {
    setSelectedReturnNote(returnNote);
    setShowViewModal(true);
  };

  const handleEditReturnNote = (returnNote: ReturnNote) => {
    setEditingReturnNote(returnNote);
    setNewReturnNote({
      supplierId: returnNote.supplierId,
      supplierName: returnNote.supplierName,
      returnDate: returnNote.returnDate.toDate().toISOString().split('T')[0],
      expectedPickupDate: returnNote.expectedPickupDate ? returnNote.expectedPickupDate.toDate().toISOString().split('T')[0] : '',
      reason: returnNote.reason,
      notes: returnNote.notes || '',
      items: returnNote.items || []
    });
    setShowAddModal(true);
  };

  const handleAddReturnNote = async () => {
    try {
      setIsSubmitting(true);
      
      console.log('Starting return note creation...');
      console.log('Current user:', currentUser);
      console.log('New return note data:', newReturnNote);
      
      // Validation checks
      const validationResult = validateReturnNote();
      if (!validationResult.isValid) {
        showValidationError(validationResult.message);
        return;
      }

      const totalQuantity = newReturnNote.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = newReturnNote.items.reduce((sum, item) => sum + item.totalValue, 0);

      const returnNoteData = {
        supplierId: newReturnNote.supplierId,
        supplierName: newReturnNote.supplierName,
        items: newReturnNote.items,
        totalQuantity,
        totalValue,
        returnDate: new Date(newReturnNote.returnDate),
        expectedPickupDate: newReturnNote.expectedPickupDate ? new Date(newReturnNote.expectedPickupDate) : undefined,
        reason: newReturnNote.reason,
        notes: newReturnNote.notes || '',
        status: 'draft' as const,
        createdBy: currentUser.uid
      };

      console.log('Processed return note data:', returnNoteData);

      const returnNoteId = await enhancedReturnNoteService.createReturnNote(returnNoteData);
      console.log('Return note created with ID:', returnNoteId);
      
      showSuccess('Return note created successfully!');
      
      // Reset form
      setNewReturnNote({
        supplierId: '',
        supplierName: '',
        returnDate: new Date().toISOString().split('T')[0],
        expectedPickupDate: '',
        reason: '',
        notes: '',
        items: []
      });
      
      setShowAddModal(false);
      loadReturnNotes();
      loadStats();
      
    } catch (error) {
      console.error('Detailed error adding return note:', error);
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          alert('Permission denied. Please check your access rights.');
        } else if (error.message.includes('network')) {
          alert('Network error. Please check your connection and try again.');
        } else if (error.message.includes('Firebase')) {
          alert(`Database error: ${error.message}`);
        } else {
          alert(`Error: ${error.message}`);
        }
      } else {
        alert('Failed to create return note. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = () => {
    // Validate the new item
    const validationResult = validateItem(newItem);
    if (!validationResult.isValid) {
      showValidationError(validationResult.message);
      return;
    }

    // Additional business logic validation
    if (!newReturnNote.supplierName) {
      showValidationError('Please select a supplier before adding items.');
      return;
    }

    // Check for duplicate items (same name and batch number)
    const existingItems = newReturnNote.items;
    const isDuplicate = existingItems.some((item, index) => {
      if (editingItemIndex >= 0 && index === editingItemIndex) return false; // Skip current item when editing
      return item.itemName.toLowerCase() === newItem.itemName.toLowerCase() &&
             item.batchNumber === newItem.batchNumber &&
             item.reason === newItem.reason;
    });

    if (isDuplicate) {
      showValidationError('An item with the same name, batch number, and reason already exists. Please modify or remove the existing item first.');
      return;
    }

    try {
      const item: ReturnItem = {
        id: editingItemIndex >= 0 ? newReturnNote.items[editingItemIndex].id : Date.now().toString(),
        itemName: newItem.itemName.trim(),
        itemDescription: newItem.itemDescription?.trim() || '',
        category: newItem.category,
        supplierName: newReturnNote.supplierName,
        quantity: newItem.quantity,
        unit: newItem.unit,
        unitPrice: newItem.unitPrice,
        totalValue: newItem.quantity * newItem.unitPrice,
        reason: newItem.reason,
        batchNumber: newItem.batchNumber?.trim() || '',
        expiryDate: newItem.expiryDate ? new Date(newItem.expiryDate) : undefined,
        invoiceNumber: newItem.invoiceNumber?.trim() || '',
        notes: newItem.notes?.trim() || ''
      };

      if (editingItemIndex >= 0) {
        const updatedItems = [...newReturnNote.items];
        updatedItems[editingItemIndex] = item;
        setNewReturnNote(prev => ({ ...prev, items: updatedItems }));
        showSuccess('Item updated successfully!');
      } else {
        setNewReturnNote(prev => ({ ...prev, items: [...prev.items, item] }));
        showSuccess('Item added successfully!');
      }

      // Reset item form
      setNewItem({
        itemName: '',
        itemDescription: '',
        category: '',
        quantity: 1,
        unit: 'pcs',
        unitPrice: 0,
        reason: '',
        batchNumber: '',
        expiryDate: '',
        invoiceNumber: '',
        notes: ''
      });

      setShowItemModal(false);
      setEditingItemIndex(-1);
    } catch (error) {
      console.error('Error adding/updating item:', error);
      showValidationError('Failed to add/update item. Please try again.');
    }
  };

  const handleEditItem = (index: number) => {
    // Validation
    const userValidation = validateUser();
    if (!userValidation.isValid) {
      showValidationError(userValidation.message);
      return;
    }

    if (index < 0 || index >= newReturnNote.items.length) {
      showValidationError('Invalid item index. Please refresh the page and try again.');
      return;
    }

    const item = newReturnNote.items[index];
    if (!item) {
      showValidationError('Item not found. Please refresh the page and try again.');
      return;
    }

    try {
      setNewItem({
        itemName: item.itemName,
        itemDescription: item.itemDescription || '',
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        reason: item.reason,
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
        invoiceNumber: item.invoiceNumber || '',
        notes: item.notes || ''
      });
      setEditingItemIndex(index);
      setShowItemModal(true);
    } catch (error) {
      console.error('Error editing item:', error);
      showValidationError('Failed to open item for editing. Please try again.');
    }
  };

  const handleRemoveItem = (index: number) => {
    // Validation
    if (index < 0 || index >= newReturnNote.items.length) {
      showValidationError('Invalid item index. Please refresh the page and try again.');
      return;
    }

    const userValidation = validateUser();
    if (!userValidation.isValid) {
      showValidationError(userValidation.message);
      return;
    }

    // Confirm deletion for safety
    const item = newReturnNote.items[index];
    if (!confirm(`Are you sure you want to remove "${item.itemName}" from this return note?`)) {
      return;
    }

    try {
      const updatedItems = newReturnNote.items.filter((_, i) => i !== index);
      setNewReturnNote(prev => ({ ...prev, items: updatedItems }));
      showSuccess(`Item "${item.itemName}" removed successfully!`);
    } catch (error) {
      console.error('Error removing item:', error);
      showValidationError('Failed to remove item. Please try again.');
    }
  };

  const handleUpdateStatus = async (returnNoteId: string, status: string) => {
    const returnNote = returnNotes.find(note => note.id === returnNoteId);
    if (!returnNote) {
      showValidationError('Return note not found.');
      return;
    }

    const validationResult = validateStatusUpdate(returnNote, status);
    if (!validationResult.isValid) {
      showValidationError(validationResult.message);
      return;
    }

    try {
      await enhancedReturnNoteService.updateReturnNoteStatus(returnNoteId, status, currentUser?.uid);
      showSuccess(`Return note status updated to ${status}`);
      loadReturnNotes();
      loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleDeleteReturnNote = (returnNote: ReturnNote) => {
    setSelectedReturnNote(returnNote);
    setShowDeleteModal(true);
  };

  const confirmDeleteReturnNote = async () => {
    if (!selectedReturnNote) {
      showValidationError('No return note selected for deletion.');
      return;
    }

    const validationResult = validateDelete(selectedReturnNote);
    if (!validationResult.isValid) {
      showValidationError(validationResult.message);
      return;
    }
    
    try {
      await enhancedReturnNoteService.deleteReturnNote(selectedReturnNote.id);
      showSuccess('Return note deleted successfully!');
      
      setShowDeleteModal(false);
      setSelectedReturnNote(null);
      loadReturnNotes();
      loadStats();
      
    } catch (error) {
      console.error('Error deleting return note:', error);
      alert('Failed to delete return note. Please try again.');
    }
  };

  // Filter return notes based on search query and filters
  const filteredReturnNotes = returnNotes.filter(returnNote => {
    const matchesSearch = searchQuery.toLowerCase() === '' || 
      (returnNote.returnNoteNumber && returnNote.returnNoteNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (returnNote.supplierName && returnNote.supplierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (returnNote.reason && returnNote.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (returnNote.items && returnNote.items.some(item => 
        item.itemName && item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    
    const matchesStatus = statusFilter === 'all' || returnNote.status === statusFilter;
    const matchesReason = reasonFilter === 'all' || returnNote.reason === reasonFilter;
    
    return matchesSearch && matchesStatus && matchesReason;
  });

  const categories = ['Electronics', 'Furniture', 'Stationery', 'Equipment', 'Supplies', 'Food', 'Clothing', 'Other'];
  const units = ['pcs', 'kg', 'lbs', 'boxes', 'cases', 'liters', 'meters', 'sets'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-violet-100">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-white rounded-3xl shadow-xl border border-white/20 backdrop-blur-sm mx-4 mt-6">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-700 opacity-90"></div>
        <div className="relative p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                  Return Notes Management
                </h1>
                <p className="text-purple-100 text-lg">Create and manage return notes for suppliers</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleRefresh}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-2xl hover:bg-white/30 transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <RefreshCw className="w-5 h-5" />
                Refresh Data
              </button>
              <button
                onClick={handleCreateReturnNoteClick}
                className="bg-white text-purple-600 px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold hover:bg-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                Create Return Note
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Total Returns</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{stats.totalReturns}</p>
                  <div className="flex items-center mt-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">All time</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Package className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Pending</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-yellow-600 transition-colors">{stats.pendingReturns}</p>
                  <div className="flex items-center mt-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">Awaiting pickup</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Clock className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Completed</p>
                  <p className="text-3xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.completedReturns}</p>
                  <div className="flex items-center mt-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">Successfully returned</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {new Intl.NumberFormat('en-UG', {
                      style: 'currency',
                      currency: 'UGX',
                      minimumFractionDigits: 0
                    }).format(stats.totalValue)}
                  </p>
                  <div className="flex items-center mt-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-xs text-gray-500">Return value</span>
                  </div>
                </div>
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search return notes by supplier, reason, or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white"
                >
                  <option value="all">All Reasons</option>
                  {RETURN_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Return Notes Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {returnNotes
            .filter(returnNote => {
              const matchesSearch = !searchQuery || 
                returnNote.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                returnNote.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                returnNote.items.some(item => 
                  item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.reason.toLowerCase().includes(searchQuery.toLowerCase())
                );
              
              const matchesStatus = statusFilter === 'all' || returnNote.status === statusFilter;
              const matchesReason = reasonFilter === 'all' || returnNote.reason === reasonFilter;
              
              return matchesSearch && matchesStatus && matchesReason;
            })
            .map((returnNote) => (
              <ReturnNoteCard
                key={returnNote.id}
                returnNote={returnNote}
                onView={handleViewReturnNote}
                onEdit={handleEditReturnNote}
                onDelete={(returnNote) => {
                  setSelectedReturnNote(returnNote);
                  setShowDeleteModal(true);
                }}
                onUpdateStatus={handleUpdateReturnNoteStatus}
              />
            ))}
        </div>

        {returnNotes.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md mx-auto">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Return Notes Yet</h3>
              <p className="text-gray-500 mb-4">Start by creating your first return note</p>
              <button
                onClick={handleCreateReturnNoteClick}
                className="bg-purple-600 text-white px-6 py-3 rounded-2xl hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create First Return Note
              </button>
            </div>
          </div>
        )}

        {searchQuery && returnNotes.filter(returnNote => {
          const matchesSearch = returnNote.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            returnNote.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
            returnNote.items.some(item => 
              item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.reason.toLowerCase().includes(searchQuery.toLowerCase())
            );
          
          const matchesStatus = statusFilter === 'all' || returnNote.status === statusFilter;
          const matchesReason = reasonFilter === 'all' || returnNote.reason === reasonFilter;
          
          return matchesSearch && matchesStatus && matchesReason;
        }).length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md mx-auto">
              <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddReturnNoteModal
          newReturnNote={newReturnNote}
          setNewReturnNote={setNewReturnNote}
          suppliers={suppliers}
          categories={categories}
          units={units}
          newItem={newItem}
          setNewItem={setNewItem}
          showItemModal={showItemModal}
          setShowItemModal={setShowItemModal}
          editingItemIndex={editingItemIndex}
          onAddItem={handleAddItem}
          onEditItem={handleEditItem}
          onRemoveItem={handleRemoveItem}
          onSubmit={handleSubmitReturnNote}
          onClose={() => setShowAddModal(false)}
          isSubmitting={isSubmitting}
          title={editingReturnNote ? "Edit Return Note" : "Create Return Note"}
          submitButtonText={editingReturnNote ? "Update Return Note" : "Create Return Note"}
        />
      )}

      {/* View Modal */}
      {showViewModal && selectedReturnNote && (
        <ViewReturnNoteModal
          returnNote={selectedReturnNote}
          onClose={() => {
            setShowViewModal(false);
            setSelectedReturnNote(null);
          }}
          onEdit={() => {
            setEditingReturnNote(selectedReturnNote);
            setShowViewModal(false);
            setShowAddModal(true);
            setIsViewMode(false);
          }}
          onUpdateStatus={handleUpdateReturnNoteStatus}
        />
      )}

      {/* Item Modal */}
      {showItemModal && (
        <ItemModal
          newItem={newItem}
          setNewItem={setNewItem}
          categories={categories}
          units={units}
          onClose={() => {
            setShowItemModal(false);
            setEditingItemIndex(-1);
          }}
          onSubmit={editingItemIndex >= 0 ? handleUpdateItem : handleAddItem}
          isEditing={editingItemIndex >= 0}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReturnNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this return note? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedReturnNote(null);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedReturnNote) {
                    try {
                      await enhancedReturnNoteService.delete(selectedReturnNote.id);
                      showSuccess('Return note deleted successfully!');
                      loadReturnNotes();
                      loadStats();
                    } catch (error) {
                      console.error('Error deleting return note:', error);
                      showValidationError('Failed to delete return note. Please try again.');
                    }
                  }
                  setShowDeleteModal(false);
                  setSelectedReturnNote(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Return Note Card Component
const ReturnNoteCard = ({ returnNote, onView, onEdit, onDelete, onUpdateStatus }: {
  returnNote: ReturnNote;
  onView: (returnNote: ReturnNote) => void;
  onEdit: (returnNote: ReturnNote) => void;
  onDelete: (returnNote: ReturnNote) => void;
  onUpdateStatus: (id: string, status: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    const color = statusConfig?.color || 'gray';
    
    switch (color) {
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'green': return 'bg-green-100 text-green-800';
      case 'blue': return 'bg-blue-100 text-blue-800';
      case 'purple': return 'bg-purple-100 text-purple-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status.toUpperCase();
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{returnNote.returnNoteNumber}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(returnNote.status)}`}>
              {getStatusLabel(returnNote.status)}
            </span>
            {(returnNote.status === 'draft' || returnNote.status === 'pending') && (
              <span className="text-gray-400" title="This return note can be edited">
                <Edit className="w-3 h-3" />
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Supplier:</span>
              <p className="text-gray-900">{returnNote.supplierName}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Return Date:</span>
              <p className="text-gray-900">{returnNote.returnDate.toDate().toLocaleDateString()}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Items:</span>
              <p className="text-gray-900">{returnNote.totalQuantity} items</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Total Value:</span>
              <p className="text-gray-900">${returnNote.totalValue.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-3">
            <span className="font-medium text-gray-600">Reason:</span>
            <p className="text-gray-900">{returnNote.reason}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Created: {returnNote.createdAt.toDate().toLocaleDateString()}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => onView(returnNote)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </button>
          
          {(returnNote.status === 'draft' || returnNote.status === 'pending') && (
            <button
              onClick={() => onEdit(returnNote)}
              className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
              title={`Edit return note ${returnNote.returnNoteNumber}`}
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </button>
          )}
          
          {returnNote.status === 'draft' && (
            <button
              onClick={() => onUpdateStatus(returnNote.id, 'pending')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-3 py-1 rounded transition-colors"
            >
              Submit
            </button>
          )}
          
          {returnNote.status === 'pending' && (
            <button
              onClick={() => onUpdateStatus(returnNote.id, 'approved')}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded transition-colors"
            >
              Approve
            </button>
          )}
          
          {returnNote.status === 'approved' && (
            <button
              onClick={() => onUpdateStatus(returnNote.id, 'picked_up')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
            >
              <Truck className="w-4 h-4 mr-1" />
              Mark Picked Up
            </button>
          )}
          
          {(returnNote.status === 'draft' || returnNote.status === 'pending') && (
            <button
              onClick={() => onDelete(returnNote)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Add/Edit Return Note Modal
const AddReturnNoteModal = ({ 
  newReturnNote, 
  setNewReturnNote, 
  suppliers, 
  categories, 
  units, 
  newItem, 
  setNewItem, 
  showItemModal, 
  setShowItemModal, 
  editingItemIndex, 
  onAddItem, 
  onEditItem, 
  onRemoveItem, 
  onSubmit, 
  onClose, 
  isSubmitting,
  title = "Create Return Note",
  submitButtonText = "Create Return Note"
}: {
  newReturnNote: any;
  setNewReturnNote: any;
  suppliers: any[];
  categories: string[];
  units: string[];
  newItem: any;
  setNewItem: any;
  showItemModal: boolean;
  setShowItemModal: any;
  editingItemIndex: number;
  onAddItem: () => void;
  onEditItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  title?: string;
  submitButtonText?: string;
}) => {
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSupplier = suppliers.find(s => s.id === e.target.value);
    setNewReturnNote(prev => ({
      ...prev,
      supplierId: e.target.value,
      supplierName: selectedSupplier ? selectedSupplier.name : ''
    }));
  };

  const totalItems = newReturnNote.items.length;
  const totalQuantity = newReturnNote.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const totalValue = newReturnNote.items.reduce((sum: number, item: any) => sum + item.totalValue, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-8">
            {/* Return Note Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  required
                  value={newReturnNote.supplierId}
                  onChange={handleSupplierChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              {/* Return Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Date *
                </label>
                <input
                  type="date"
                  required
                  value={newReturnNote.returnDate}
                  onChange={(e) => setNewReturnNote(prev => ({ ...prev, returnDate: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Expected Pickup Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Pickup Date
                </label>
                <input
                  type="date"
                  value={newReturnNote.expectedPickupDate}
                  onChange={(e) => setNewReturnNote(prev => ({ ...prev, expectedPickupDate: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Return Reason *
                </label>
                <select
                  required
                  value={newReturnNote.reason}
                  onChange={(e) => setNewReturnNote(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select reason</option>
                  {RETURN_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={newReturnNote.notes}
                onChange={(e) => setNewReturnNote(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter any additional notes about this return..."
              />
            </div>

            {/* Items Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Return Items</h3>
                <button
                  type="button"
                  onClick={handleAddItemClick}
                  disabled={!newReturnNote.supplierId}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </button>
              </div>

              {!newReturnNote.supplierId && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm">
                    Please select a supplier first before adding items.
                  </p>
                </div>
              )}

              {/* Items List */}
              {newReturnNote.items.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {newReturnNote.items.map((item: any, index: number) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-gray-900">{item.itemName}</h4>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              {item.reason}
                            </span>
                          </div>
                          
                          {item.itemDescription && (
                            <p className="text-sm text-gray-600 mb-2">{item.itemDescription}</p>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Category:</span>
                              <p className="text-gray-900">{item.category}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Quantity:</span>
                              <p className="text-gray-900">{item.quantity} {item.unit}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Unit Price:</span>
                              <p className="text-gray-900">${item.unitPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Total:</span>
                              <p className="text-gray-900 font-semibold">${item.totalValue.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          {(item.batchNumber || item.expiryDate || item.invoiceNumber) && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-2 pt-2 border-t border-gray-100">
                              {item.batchNumber && (
                                <div>
                                  <span className="font-medium text-gray-600">Batch:</span>
                                  <p className="text-gray-900">{item.batchNumber}</p>
                                </div>
                              )}
                              {item.expiryDate && (
                                <div>
                                  <span className="font-medium text-gray-600">Expiry:</span>
                                  <p className="text-gray-900">{new Date(item.expiryDate).toLocaleDateString()}</p>
                                </div>
                              )}
                              {item.invoiceNumber && (
                                <div>
                                  <span className="font-medium text-gray-600">Invoice:</span>
                                  <p className="text-gray-900">{item.invoiceNumber}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => onEditItem(index)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(index)}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No items added yet</p>
                  <p className="text-sm text-gray-500">Add items to create the return note</p>
                </div>
              )}

              {/* Items Summary */}
              {newReturnNote.items.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-blue-900">Total Items</p>
                      <p className="text-xl font-bold text-blue-700">{totalItems}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-blue-900">Total Quantity</p>
                      <p className="text-xl font-bold text-blue-700">{totalQuantity}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-blue-900">Total Value</p>
                      <p className="text-xl font-bold text-blue-700">${totalValue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newReturnNote.supplierId || !newReturnNote.reason || newReturnNote.items.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {title.includes('Edit') ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  <>
                    {title.includes('Edit') ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {submitButtonText}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <ItemModal
          newItem={newItem}
          setNewItem={setNewItem}
          categories={categories}
          units={units}
          editingItemIndex={editingItemIndex}
          onSubmit={onAddItem}
          onClose={() => setShowItemModal(false)}
        />
      )}
    </>
  );
};

// Item Modal Component
const ItemModal = ({ 
  newItem, 
  setNewItem, 
  categories, 
  units, 
  editingItemIndex, 
  onSubmit, 
  onClose 
}: {
  newItem: any;
  setNewItem: any;
  categories: string[];
  units: string[];
  editingItemIndex: number;
  onSubmit: () => void;
  onClose: () => void;
}) => {
  const isEditing = editingItemIndex >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Item' : 'Add Item'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                required
                value={newItem.itemName}
                onChange={(e) => setNewItem(prev => ({ ...prev, itemName: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter item name"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                required
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit Price *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {/* Return Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Return Reason *
              </label>
              <select
                required
                value={newItem.reason}
                onChange={(e) => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select reason</option>
                {RETURN_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch Number
              </label>
              <input
                type="text"
                value={newItem.batchNumber}
                onChange={(e) => setNewItem(prev => ({ ...prev, batchNumber: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter batch number"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                value={newItem.expiryDate}
                onChange={(e) => setNewItem(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number
              </label>
              <input
                type="text"
                value={newItem.invoiceNumber}
                onChange={(e) => setNewItem(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter invoice number"
              />
            </div>
          </div>

          {/* Item Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Description
            </label>
            <textarea
              value={newItem.itemDescription}
              onChange={(e) => setNewItem(prev => ({ ...prev, itemDescription: e.target.value }))}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter item description (optional)"
            />
          </div>

          {/* Item Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Notes
            </label>
            <textarea
              value={newItem.notes}
              onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter any additional notes about this item"
            />
          </div>

          {/* Total Value Display */}
          {newItem.quantity > 0 && newItem.unitPrice > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-green-800">Total Value</p>
                <p className="text-2xl font-bold text-green-700">
                  ${(newItem.quantity * newItem.unitPrice).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newItem.itemName.trim() || !newItem.reason || newItem.quantity <= 0 || newItem.unitPrice <= 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isEditing ? (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Item
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// View Return Note Modal Component
const ViewReturnNoteModal = ({ returnNote, onClose, onEdit, onUpdateStatus }: {
  returnNote: ReturnNote;
  onClose: () => void;
  onEdit: () => void;
  onUpdateStatus?: (id: string, status: string) => void;
}) => {
  const getStatusColor = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    const color = statusConfig?.color || 'gray';
    
    switch (color) {
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'red': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusConfig = RETURN_STATUSES.find(s => s.value === status);
    return statusConfig?.label || status.toUpperCase();
  };

  const canEdit = ['draft', 'pending'].includes(returnNote.status);

  const handlePrintReturnNote = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Return Note - ${returnNote.returnNoteNumber}</title>
          <style>
            @media print {
              @page {
                margin: 0.5in;
                size: A4;
              }
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.4;
              color: #333;
              background: white;
            }
            
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background: white;
            }
            
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            
            .company-info h1 {
              font-size: 28px;
              color: #2563eb;
              margin-bottom: 5px;
              font-weight: bold;
            }
            
            .company-info p {
              color: #666;
              font-size: 14px;
            }
            
            .invoice-title {
              text-align: right;
            }
            
            .invoice-title h2 {
              font-size: 32px;
              color: #dc2626;
              margin-bottom: 5px;
              font-weight: bold;
            }
            
            .invoice-title .status {
              background: ${returnNote.status === 'approved' ? '#10b981' : returnNote.status === 'pending' ? '#f59e0b' : '#6b7280'};
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              display: inline-block;
            }
            
            .invoice-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            
            .details-section h3 {
              font-size: 16px;
              color: #374151;
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            
            .detail-row .label {
              font-weight: 600;
              color: #6b7280;
              min-width: 120px;
            }
            
            .detail-row .value {
              color: #111827;
              text-align: right;
              flex: 1;
            }
            
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              background: white;
              border: 1px solid #e5e7eb;
            }
            
            .items-table th {
              background: #f9fafb;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .items-table td {
              padding: 12px 8px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 14px;
            }
            
            .items-table tr:nth-child(even) {
              background: #f9fafb;
            }
            
            .items-table tr:hover {
              background: #f3f4f6;
            }
            
            .reason-badge {
              background: #fef2f2;
              color: #dc2626;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
              border: 1px solid #fecaca;
            }
            
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 30px;
            }
            
            .totals-table {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              min-width: 300px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            
            .total-row.final {
              border-top: 2px solid #2563eb;
              padding-top: 12px;
              margin-top: 12px;
              font-weight: bold;
              font-size: 18px;
              color: #2563eb;
            }
            
            .notes-section {
              background: #fef7cd;
              border: 1px solid #f3e585;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }
            
            .notes-section h3 {
              color: #92400e;
              margin-bottom: 10px;
              font-size: 14px;
              font-weight: 600;
            }
            
            .notes-section p {
              color: #451a03;
              font-size: 14px;
              line-height: 1.5;
            }
            
            .footer {
              text-align: center;
              border-top: 2px solid #e5e7eb;
              padding-top: 20px;
              margin-top: 30px;
              color: #6b7280;
              font-size: 12px;
            }
            
            .signature-section {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 30px;
              margin: 40px 0 20px 0;
            }
            
            .signature-box {
              text-align: center;
              border-top: 2px solid #e5e7eb;
              padding-top: 10px;
            }
            
            .signature-box .title {
              font-weight: 600;
              color: #374151;
              font-size: 12px;
              text-transform: uppercase;
            }
            
            .signature-box .line {
              margin: 30px 0 10px 0;
              height: 1px;
              background: #d1d5db;
            }
            
            @media print {
              .invoice-container {
                padding: 0;
                box-shadow: none;
              }
              
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <!-- Header -->
            <div class="invoice-header">
              <div class="company-info">
                <h1>EQUI SYSTEM</h1>
                <p>Inventory Management System</p>
                <p>Return Note Department</p>
              </div>
              <div class="invoice-title">
                <h2>RETURN NOTE</h2>
                <div class="status">${returnNote.status.toUpperCase()}</div>
              </div>
            </div>
            
            <!-- Invoice Details -->
            <div class="invoice-details">
              <div class="details-section">
                <h3>Return Note Information</h3>
                <div class="detail-row">
                  <span class="label">Return Note #:</span>
                  <span class="value">${returnNote.returnNoteNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Return Date:</span>
                  <span class="value">${returnNote.returnDate.toDate().toLocaleDateString()}</span>
                </div>
                ${returnNote.expectedPickupDate ? `
                <div class="detail-row">
                  <span class="label">Expected Pickup:</span>
                  <span class="value">${returnNote.expectedPickupDate.toDate().toLocaleDateString()}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="label">Created:</span>
                  <span class="value">${returnNote.createdAt.toDate().toLocaleDateString()}</span>
                </div>
              </div>
              
              <div class="details-section">
                <h3>Supplier Information</h3>
                <div class="detail-row">
                  <span class="label">Supplier:</span>
                  <span class="value">${returnNote.supplierName}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Return Reason:</span>
                  <span class="value">${returnNote.reason}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Total Items:</span>
                  <span class="value">${returnNote.items.length}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Total Quantity:</span>
                  <span class="value">${returnNote.totalQuantity}</span>
                </div>
              </div>
            </div>
            
            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 5%">#</th>
                  <th style="width: 25%">Item Name</th>
                  <th style="width: 12%">Category</th>
                  <th style="width: 10%">Qty</th>
                  <th style="width: 8%">Unit</th>
                  <th style="width: 12%">Unit Price</th>
                  <th style="width: 12%">Total</th>
                  <th style="width: 16%">Reason</th>
                </tr>
              </thead>
              <tbody>
                ${returnNote.items.map((item, index) => `
                  <tr>
                    <td style="text-align: center; color: #6b7280;">${index + 1}</td>
                    <td>
                      <div style="font-weight: 600;">${item.itemName}</div>
                      ${item.itemDescription ? `<div style="font-size: 12px; color: #6b7280;">${item.itemDescription}</div>` : ''}
                      ${item.batchNumber ? `<div style="font-size: 11px; color: #059669;">Batch: ${item.batchNumber}</div>` : ''}
                      ${item.expiryDate ? `<div style="font-size: 11px; color: #dc2626;">Exp: ${item.expiryDate.toDate().toLocaleDateString()}</div>` : ''}
                    </td>
                    <td>${item.category || 'N/A'}</td>
                    <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
                    <td style="text-align: center;">${item.unit}</td>
                    <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 600;">$${item.totalValue.toFixed(2)}</td>
                    <td><span class="reason-badge">${item.reason}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <!-- Totals -->
            <div class="totals-section">
              <div class="totals-table">
                <div class="total-row">
                  <span>Total Items:</span>
                  <span>${returnNote.items.length}</span>
                </div>
                <div class="total-row">
                  <span>Total Quantity:</span>
                  <span>${returnNote.totalQuantity}</span>
                </div>
                <div class="total-row final">
                  <span>Total Value:</span>
                  <span>$${returnNote.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            ${returnNote.notes ? `
            <!-- Notes -->
            <div class="notes-section">
              <h3>Additional Notes</h3>
              <p>${returnNote.notes}</p>
            </div>
            ` : ''}
            
            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-box">
                <div class="line"></div>
                <div class="title">Prepared By</div>
              </div>
              <div class="signature-box">
                <div class="line"></div>
                <div class="title">Approved By</div>
              </div>
              <div class="signature-box">
                <div class="line"></div>
                <div class="title">Received By</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>This is a computer-generated return note. No signature is required.</p>
              <p>Generated on ${new Date().toLocaleString()} | EQUI Inventory Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Return Note Details</h2>
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(returnNote.status)}`}>
              {getStatusLabel(returnNote.status)}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {canEdit && (
              <button
                onClick={onEdit}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Return Note Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">General Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Return Note Number</label>
                  <p className="text-gray-900 font-medium">{returnNote.returnNoteNumber}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Supplier</label>
                  <p className="text-gray-900">{returnNote.supplierName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Return Date</label>
                  <p className="text-gray-900">{returnNote.returnDate.toDate().toLocaleDateString()}</p>
                </div>
                
                {returnNote.expectedPickupDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Expected Pickup Date</label>
                    <p className="text-gray-900">{returnNote.expectedPickupDate.toDate().toLocaleDateString()}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-600">Return Reason</label>
                  <p className="text-gray-900">{returnNote.reason}</p>
                </div>
                
                {returnNote.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Notes</label>
                    <p className="text-gray-900">{returnNote.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-semibold text-gray-900">{returnNote.items.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Quantity:</span>
                  <span className="font-semibold text-gray-900">{returnNote.totalQuantity}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Value:</span>
                  <span className="font-semibold text-gray-900">${returnNote.totalValue.toLocaleString()}</span>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Created:</span>
                    <span>{returnNote.createdAt.toDate().toLocaleString()}</span>
                  </div>
                  
                  {returnNote.updatedAt && (
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                      <span>Last Updated:</span>
                      <span>{returnNote.updatedAt.toDate().toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Return Items */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Items ({returnNote.items.length})</h3>
          
          {returnNote.items.length > 0 ? (
            <div className="space-y-4">
              {returnNote.items.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{item.itemName}</h4>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          {item.reason}
                        </span>
                      </div>
                      
                      {item.itemDescription && (
                        <p className="text-gray-600 mb-3">{item.itemDescription}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
                      <p className="text-gray-900">{item.category || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
                      <p className="text-gray-900">{item.quantity} {item.unit}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Unit Price</label>
                      <p className="text-gray-900">${item.unitPrice.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Total Value</label>
                      <p className="text-gray-900 font-semibold">${item.totalValue.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {(item.batchNumber || item.expiryDate || item.invoiceNumber) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4 pt-4 border-t border-gray-100">
                      {item.batchNumber && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Batch Number</label>
                          <p className="text-gray-900">{item.batchNumber}</p>
                        </div>
                      )}
                      
                      {item.expiryDate && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Expiry Date</label>
                          <p className="text-gray-900">{item.expiryDate.toDate().toLocaleDateString()}</p>
                        </div>
                      )}
                      
                      {item.invoiceNumber && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Invoice Number</label>
                          <p className="text-gray-900">{item.invoiceNumber}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {item.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                      <p className="text-gray-900">{item.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No items in this return note</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
          <div className="flex space-x-3">
            <button
              onClick={handlePrintReturnNote}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Print
            </button>
            
            {canEdit && (
              <button
                onClick={onEdit}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
            )}
            
            {/* Status Update Buttons */}
            {onUpdateStatus && (
              <>
                {returnNote.status === 'draft' && (
                  <button
                    onClick={() => {
                      onUpdateStatus(returnNote.id, 'pending');
                      onClose();
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Submit for Approval
                  </button>
                )}
                
                {returnNote.status === 'pending' && (
                  <button
                    onClick={() => {
                      onUpdateStatus(returnNote.id, 'approved');
                      onClose();
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </button>
                )}
                
                {returnNote.status === 'approved' && (
                  <button
                    onClick={() => {
                      onUpdateStatus(returnNote.id, 'picked_up');
                      onClose();
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Mark as Picked Up
                  </button>
                )}
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 