import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  Users, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { PurchaseManagerQueries } from '@/lib/firebase/role-based-queries';

interface FundAcknowledgment {
  id: string;
  fundType: string;
  allocatedAmount: number;
  actualAmountReceived: number;
  discrepancyAmount: number;
  acknowledgedAt: any;
  notes?: string;
}

interface Supplier {
  id: string;
  supplierName: string;
  tinNumber: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  bankName: string;
  accountNumber: string;
  status: string;
}

interface RestockItem {
  id: string;
  itemName: string;
  currentStock: number;
  restockThreshold: number;
  restockQuantity: number;
  supplierId: string;
  priority: 'URGENT' | 'MEDIUM' | 'LOW';
  lastRestocked?: any;
}

export default function PurchaseManagerDashboard() {
  const [fundAcknowledgments, setFundAcknowledgments] = useState<FundAcknowledgment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [restockItems, setRestockItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Set up real-time subscription for fund acknowledgments
  useEffect(() => {
    const unsubscribe = PurchaseManagerQueries.subscribeFundAcknowledgments((data) => {
      setFundAcknowledgments(data);
    });

    return () => unsubscribe();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [fundAcks, managedSuppliers, restockData] = await Promise.all([
        PurchaseManagerQueries.getFundAcknowledgments(),
        PurchaseManagerQueries.getManagedSuppliers(),
        PurchaseManagerQueries.getRestockItems()
      ]);

      setFundAcknowledgments(fundAcks);
      setSuppliers(managedSuppliers);
      setRestockItems(restockData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-UG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate summary statistics
  const totalFundsAllocated = fundAcknowledgments.reduce((sum, ack) => sum + ack.allocatedAmount, 0);
  const totalFundsReceived = fundAcknowledgments.reduce((sum, ack) => sum + ack.actualAmountReceived, 0);
  const totalDiscrepancy = fundAcknowledgments.reduce((sum, ack) => sum + Math.abs(ack.discrepancyAmount), 0);
  const urgentRestockItems = restockItems.filter(item => item.priority === 'URGENT').length;
  const activeSuppliers = suppliers.filter(supplier => supplier.status.toLowerCase() === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Manage funds, suppliers, and inventory restocking
          </p>
        </div>
        <Button onClick={loadDashboardData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funds Allocated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFundsAllocated)}</div>
            <p className="text-xs text-muted-foreground">
              Received: {formatCurrency(totalFundsReceived)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Total: {suppliers.length} suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Restock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{urgentRestockItems}</div>
            <p className="text-xs text-muted-foreground">
              Total items: {restockItems.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fund Discrepancies</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDiscrepancy)}</div>
            <p className="text-xs text-muted-foreground">
              Acknowledgments: {fundAcknowledgments.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="funds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funds">Fund Acknowledgments</TabsTrigger>
          <TabsTrigger value="suppliers">Managed Suppliers</TabsTrigger>
          <TabsTrigger value="restock">Restock Items</TabsTrigger>
        </TabsList>

        {/* Fund Acknowledgments Tab */}
        <TabsContent value="funds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fund Acknowledgments</CardTitle>
              <CardDescription>
                Track and acknowledge allocated purchasing funds (Rule 2.1)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fundAcknowledgments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fund acknowledgments found
                </div>
              ) : (
                <div className="space-y-4">
                  {fundAcknowledgments.map((ack) => (
                    <div key={ack.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{ack.fundType} Fund</h4>
                          <p className="text-sm text-muted-foreground">
                            Acknowledged: {formatDate(ack.acknowledgedAt)}
                          </p>
                        </div>
                        <Badge variant={ack.discrepancyAmount === 0 ? 'default' : 'destructive'}>
                          {ack.discrepancyAmount === 0 ? 'Balanced' : 'Discrepancy'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Allocated:</span>
                          <p className="font-medium">{formatCurrency(ack.allocatedAmount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Received:</span>
                          <p className="font-medium">{formatCurrency(ack.actualAmountReceived)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Discrepancy:</span>
                          <p className={`font-medium ${ack.discrepancyAmount !== 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {formatCurrency(ack.discrepancyAmount)}
                          </p>
                        </div>
                      </div>
                      
                      {ack.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Notes:</strong> {ack.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Managed Suppliers</CardTitle>
              <CardDescription>
                Suppliers under your management (Rule 5.2)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No suppliers assigned to you
                </div>
              ) : (
                <div className="space-y-4">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{supplier.supplierName}</h4>
                          <p className="text-sm text-muted-foreground">
                            TIN: {supplier.tinNumber}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(supplier.status)}>
                          {supplier.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Contact Person:</span>
                          <p className="font-medium">{supplier.contactPerson}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium">{supplier.phoneNumber}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{supplier.email}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Bank:</span>
                          <p className="font-medium">{supplier.bankName}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restock Items Tab */}
        <TabsContent value="restock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Restock Items</CardTitle>
              <CardDescription>
                Items requiring restocking with priority classification (Rules 7.1, 7.2)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {restockItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No restock items found
                </div>
              ) : (
                <div className="space-y-4">
                  {restockItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{item.itemName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Last restocked: {formatDate(item.lastRestocked)}
                          </p>
                        </div>
                        <Badge variant={getPriorityColor(item.priority)}>
                          {item.priority} Priority
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Current Stock:</span>
                          <p className="font-medium">{item.currentStock}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Threshold:</span>
                          <p className="font-medium">{item.restockThreshold}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Restock Quantity:</span>
                          <p className="font-medium">{item.restockQuantity}</p>
                        </div>
                      </div>
                      
                      {item.priority === 'URGENT' && (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            This item is critically low and requires immediate restocking!
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 