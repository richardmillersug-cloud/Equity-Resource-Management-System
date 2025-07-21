import { FirestoreService } from './firestore-service';
import { Timestamp } from 'firebase/firestore';
import { enhancedInvoiceService } from './enhanced-invoice';
import { enhancedSupplierService } from './enhanced-supplier';
import { enhancedBarcodeService } from './enhanced-barcode';
import { EnhancedReturnNoteService } from './enhanced-return-note';

export interface Notification {
  id: string;
  userId: string;
  userRole: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'urgent';
  title: string;
  message: string;
  actionRequired: boolean;
  actionType?: 'approve' | 'review' | 'update' | 'view' | 'process';
  actionUrl?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'invoice' | 'supplier' | 'return_note' | 'barcode' | 'employee' | 'expense';
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  metadata?: Record<string, any>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  urgent: number;
}

export class NotificationService extends FirestoreService<Notification> {
  constructor() {
    super('notifications');
  }

  // Generate role-specific notifications from existing system data
  async generateNotifications(userId: string, userRole: string): Promise<Notification[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];
    const now = Timestamp.now();

    try {
      switch (userRole.toLowerCase()) {
        case 'receiver':
          notifications.push(...await this.generateReceiverNotifications(userId));
          break;
        case 'purchasing manager':
        case 'purchase manager':
        case 'purchase-manager':
          notifications.push(...await this.generatePurchaseManagerNotifications(userId));
          break;
        case 'hr':
        case 'human resources':
          notifications.push(...await this.generateHRNotifications(userId));
          break;
        case 'accountant':
          notifications.push(...await this.generateAccountantNotifications(userId));
          break;
        case 'auditor':
          notifications.push(...await this.generateAuditorNotifications(userId));
          break;
        case 'manager':
          notifications.push(...await this.generateManagerNotifications(userId));
          break;
        case 'admin':
          notifications.push(...await this.generateAdminNotifications(userId));
          break;
        default:
          notifications.push(...await this.generateGeneralNotifications(userId));
      }

      // Create notifications in database
      const createdNotifications: Notification[] = [];
      for (const notification of notifications) {
        const id = await this.create({
          ...notification,
          createdAt: now
        });
        createdNotifications.push({
          ...notification,
          id,
          createdAt: now
        });
      }

      return createdNotifications;
    } catch (error) {
      console.error('Error generating notifications:', error);
      return [];
    }
  }

  // Receiver notifications
  private async generateReceiverNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];

    try {
      // Check for pending invoices
      const invoices = await enhancedInvoiceService.getAll();
      const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;
      
      if (pendingInvoices > 0) {
        notifications.push({
          userId,
          userRole: 'receiver',
          type: 'info',
          title: 'Pending Invoices',
          message: `You have ${pendingInvoices} pending invoice${pendingInvoices > 1 ? 's' : ''} requiring attention`,
          actionRequired: true,
          actionType: 'review',
          actionUrl: '/dashboard/receiver/invoices',
          relatedEntityType: 'invoice',
          isRead: false,
          priority: pendingInvoices > 10 ? 'high' : 'medium'
        });
      }

      // Check for overdue invoices
      const now = new Date();
      const overdueInvoices = invoices.filter(inv => 
        inv.dueDate && 
        inv.dueDate.toDate() < now && 
        !['Paid', 'Rejected'].includes(inv.status)
      ).length;

      if (overdueInvoices > 0) {
        notifications.push({
          userId,
          userRole: 'receiver',
          type: 'warning',
          title: 'Overdue Invoices',
          message: `${overdueInvoices} invoice${overdueInvoices > 1 ? 's are' : ' is'} overdue and need${overdueInvoices > 1 ? '' : 's'} immediate attention`,
          actionRequired: true,
          actionType: 'process',
          actionUrl: '/dashboard/receiver/invoices',
          relatedEntityType: 'invoice',
          isRead: false,
          priority: 'high'
        });
      }

      // Check for pending return notes
      const returnNoteService = new EnhancedReturnNoteService();
      const returnNotes = await returnNoteService.getAll();
      const pendingReturns = returnNotes.filter(rn => rn.status === 'pending').length;

      if (pendingReturns > 0) {
        notifications.push({
          userId,
          userRole: 'receiver',
          type: 'info',
          title: 'Pending Returns',
          message: `${pendingReturns} return note${pendingReturns > 1 ? 's are' : ' is'} pending pickup`,
          actionRequired: true,
          actionType: 'review',
          actionUrl: '/dashboard/receiver/returns',
          relatedEntityType: 'return_note',
          isRead: false,
          priority: 'medium'
        });
      }

      // Check for inactive suppliers
      const suppliers = await enhancedSupplierService.getAll();
      const inactiveSuppliers = suppliers.filter(s => s.status === 'Inactive').length;

      if (inactiveSuppliers > 0) {
        notifications.push({
          userId,
          userRole: 'receiver',
          type: 'warning',
          title: 'Inactive Suppliers',
          message: `${inactiveSuppliers} supplier${inactiveSuppliers > 1 ? 's are' : ' is'} currently inactive`,
          actionRequired: true,
          actionType: 'review',
          actionUrl: '/dashboard/receiver/suppliers',
          relatedEntityType: 'supplier',
          isRead: false,
          priority: 'low'
        });
      }

    } catch (error) {
      console.error('Error generating receiver notifications:', error);
    }

    return notifications;
  }

  // Purchase Manager notifications
  private async generatePurchaseManagerNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];

    try {
      // Check for invoices needing approval
      const invoices = await enhancedInvoiceService.getAll();
      const pendingApproval = invoices.filter(inv => inv.status === 'Pending').length;

      if (pendingApproval > 0) {
        notifications.push({
          userId,
          userRole: 'purchasing manager',
          type: 'warning',
          title: 'Invoices Pending Approval',
          message: `${pendingApproval} invoice${pendingApproval > 1 ? 's require' : ' requires'} your approval`,
          actionRequired: true,
          actionType: 'approve',
          actionUrl: '/dashboard/purchase-manager/invoices',
          relatedEntityType: 'invoice',
          isRead: false,
          priority: 'high'
        });
      }

      // Check for high-value invoices
      const highValueInvoices = invoices.filter(inv => 
        inv.amount > 100000 && 
        inv.status === 'Pending'
      ).length;

      if (highValueInvoices > 0) {
        notifications.push({
          userId,
          userRole: 'purchasing manager',
          type: 'urgent',
          title: 'High-Value Invoices',
          message: `${highValueInvoices} high-value invoice${highValueInvoices > 1 ? 's need' : ' needs'} special attention`,
          actionRequired: true,
          actionType: 'review',
          actionUrl: '/dashboard/purchase-manager/invoices',
          relatedEntityType: 'invoice',
          isRead: false,
          priority: 'critical'
        });
      }

      // Check for pending supplier approvals
      const suppliers = await enhancedSupplierService.getAll();
      const pendingSuppliers = suppliers.filter(s => s.status === 'Pending').length;

      if (pendingSuppliers > 0) {
        notifications.push({
          userId,
          userRole: 'purchasing manager',
          type: 'info',
          title: 'Supplier Approvals',
          message: `${pendingSuppliers} new supplier${pendingSuppliers > 1 ? 's need' : ' needs'} approval`,
          actionRequired: true,
          actionType: 'approve',
          actionUrl: '/dashboard/purchase-manager/suppliers',
          relatedEntityType: 'supplier',
          isRead: false,
          priority: 'medium'
        });
      }

    } catch (error) {
      console.error('Error generating purchase manager notifications:', error);
    }

    return notifications;
  }

  // HR notifications
  private async generateHRNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];

    try {
      // Check for pending employee documents
      notifications.push({
        userId,
        userRole: 'hr',
        type: 'info',
        title: 'Employee Documentation',
        message: 'Review employee document submissions and updates',
        actionRequired: true,
        actionType: 'review',
        actionUrl: '/dashboard/hr/employee-documents',
        relatedEntityType: 'employee',
        isRead: false,
        priority: 'medium'
      });

      // Check for barcode activities
      const barcodeItems = await enhancedBarcodeService.getAll();
      const recentBarcodes = barcodeItems.filter(item => {
        const createdDate = item.createdAt.toDate();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return createdDate >= yesterday;
      }).length;

      if (recentBarcodes > 0) {
        notifications.push({
          userId,
          userRole: 'hr',
          type: 'success',
          title: 'Recent Barcode Activity',
          message: `${recentBarcodes} new barcode item${recentBarcodes > 1 ? 's were' : ' was'} created recently`,
          actionRequired: false,
          actionType: 'view',
          actionUrl: '/dashboard/hr/barcodes',
          relatedEntityType: 'barcode',
          isRead: false,
          priority: 'low'
        });
      }

    } catch (error) {
      console.error('Error generating HR notifications:', error);
    }

    return notifications;
  }

  // Accountant notifications
  private async generateAccountantNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];

    try {
      // Check for invoices needing payment processing
      const invoices = await enhancedInvoiceService.getAll();
      const approvedInvoices = invoices.filter(inv => inv.status === 'Approved').length;

      if (approvedInvoices > 0) {
        notifications.push({
          userId,
          userRole: 'accountant',
          type: 'warning',
          title: 'Payment Processing',
          message: `${approvedInvoices} approved invoice${approvedInvoices > 1 ? 's are' : ' is'} ready for payment`,
          actionRequired: true,
          actionType: 'process',
          actionUrl: '/dashboard/accountant/expenses',
          relatedEntityType: 'invoice',
          isRead: false,
          priority: 'high'
        });
      }

      // Calculate total outstanding amount
      const outstandingAmount = invoices
        .filter(inv => ['Pending', 'Approved'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.amount, 0);

      if (outstandingAmount > 500000) {
        notifications.push({
          userId,
          userRole: 'accountant',
          type: 'urgent',
          title: 'High Outstanding Amount',
          message: `Outstanding payments total UGX ${outstandingAmount.toLocaleString()}`,
          actionRequired: true,
          actionType: 'review',
          actionUrl: '/dashboard/accountant/reports',
          relatedEntityType: 'invoice',
          isRead: false,
          priority: 'critical'
        });
      }

    } catch (error) {
      console.error('Error generating accountant notifications:', error);
    }

    return notifications;
  }

  // Auditor notifications
  private async generateAuditorNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];

    try {
      // Check for items needing audit
      const invoices = await enhancedInvoiceService.getAll();
      const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;

      if (paidInvoices > 0) {
        notifications.push({
          userId,
          userRole: 'auditor',
          type: 'info',
          title: 'Audit Review Required',
          message: `${paidInvoices} paid invoice${paidInvoices > 1 ? 's require' : ' requires'} audit review`,
          actionRequired: true,
          actionType: 'review',
          actionUrl: '/dashboard/auditor',
          relatedEntityType: 'invoice',
          isRead: false,
          priority: 'medium'
        });
      }

    } catch (error) {
      console.error('Error generating auditor notifications:', error);
    }

    return notifications;
  }

  // Manager notifications
  private async generateManagerNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];

    try {
      // Summary dashboard notifications
      const invoices = await enhancedInvoiceService.getAll();
      const totalValue = invoices.reduce((sum, inv) => sum + inv.amount, 0);

      notifications.push({
        userId,
        userRole: 'manager',
        type: 'info',
        title: 'Daily Summary',
        message: `Total invoice value: UGX ${totalValue.toLocaleString()}. ${invoices.length} total invoices in system.`,
        actionRequired: false,
        actionType: 'view',
        actionUrl: '/dashboard/manager',
        relatedEntityType: 'invoice',
        isRead: false,
        priority: 'low'
      });

    } catch (error) {
      console.error('Error generating manager notifications:', error);
    }

    return notifications;
  }

  // Admin notifications
  private async generateAdminNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    const notifications: Omit<Notification, 'id' | 'createdAt'>[] = [];

    try {
      // System health checks
      notifications.push({
        userId,
        userRole: 'admin',
        type: 'success',
        title: 'System Status',
        message: 'All systems are operational and running smoothly',
        actionRequired: false,
        actionType: 'view',
        actionUrl: '/dashboard/admin',
        isRead: false,
        priority: 'low'
      });

    } catch (error) {
      console.error('Error generating admin notifications:', error);
    }

    return notifications;
  }

  // General notifications for unknown roles
  private async generateGeneralNotifications(userId: string): Promise<Omit<Notification, 'id' | 'createdAt'>[]> {
    return [{
      userId,
      userRole: 'general',
      type: 'info',
      title: 'Welcome',
      message: 'Welcome to the system dashboard',
      actionRequired: false,
      isRead: false,
      priority: 'low'
    }];
  }

  // Get notifications for a specific user
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await this.getAll([{
      field: 'userId',
      operator: '==',
      value: userId
    }], {
      orderBy: 'createdAt',
      orderDirection: 'desc'
    });
  }

  // Get unread notifications count
  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.getAll([
      { field: 'userId', operator: '==', value: userId },
      { field: 'isRead', operator: '==', value: false }
    ]);
    return notifications.length;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await this.update(notificationId, { isRead: true });
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    const unreadNotifications = await this.getAll([
      { field: 'userId', operator: '==', value: userId },
      { field: 'isRead', operator: '==', value: false }
    ]);

    for (const notification of unreadNotifications) {
      await this.markAsRead(notification.id);
    }
  }

  // Get notification statistics
  async getNotificationStats(userId: string): Promise<NotificationStats> {
    const notifications = await this.getNotificationsByUser(userId);
    
    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byType: {},
      byPriority: {},
      urgent: notifications.filter(n => n.type === 'urgent').length
    };

    // Count by type
    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
      stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
    });

    return stats;
  }

  // Delete old notifications (older than 30 days)
  async cleanupOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldNotifications = await this.getAll([{
      field: 'createdAt',
      operator: '<',
      value: Timestamp.fromDate(thirtyDaysAgo)
    }]);

    let deletedCount = 0;
    for (const notification of oldNotifications) {
      await this.delete(notification.id);
      deletedCount++;
    }

    return deletedCount;
  }
}

export const notificationService = new NotificationService();