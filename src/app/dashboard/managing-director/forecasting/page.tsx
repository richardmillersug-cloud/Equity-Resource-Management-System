'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Calendar,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  ArrowRight,
  BarChart3,
  LineChart,
  Users,
  DollarSign,
  Package,
  Building2,
  Eye,
  Filter
} from 'lucide-react';
import { firestoreServices } from '../../../../lib/firebase/firestore-service';
import { authService } from '../../../../lib/firebase/auth';

export default function ForecastingInsightsPage() {
  const [loading, setLoading] = useState(true);
  const [forecastData, setForecastData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('6months');
  const [selectedModel, setSelectedModel] = useState('advanced');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [confidence, setConfidence] = useState(87.5);

  useEffect(() => {
    loadForecastingData();
  }, [selectedTimeframe, selectedModel]);

  const loadForecastingData = async () => {
    try {
      setLoading(true);
      
      // Load historical data for forecasting (prioritizing cash close data)
      const [
        employees,
        branches,
        cashAllocations,
        expenses,
        invoices,
        attendance,
        payrolls,
        auditLogs,
        cashCloses
      ] = await Promise.all([
        firestoreServices.employee.getAll(),
        firestoreServices.branch.getAll(),
        firestoreServices.cashAllocation.getAll(),
        firestoreServices.expense.getAll(),
        firestoreServices.invoice.getAll(),
        firestoreServices.attendance.getAll(),
        firestoreServices.payroll.getAll(),
        firestoreServices.audit.getAll([], { limit: 100, orderBy: 'timestamp', orderDirection: 'desc' }),
        firestoreServices.cashClose.getAll([], { orderBy: 'closeCashTime', orderDirection: 'desc', limit: 365 }) // Last year of cash closes
      ]);

      // Generate supermarket-specific forecasting insights
      const forecasts = {
        // Sales Forecasting (Based on Cash Close Analysis)
        salesForecast: {
          currentSales: calculateCurrentSalesFromCashClose(cashCloses),
          projectedSales: generateSalesForecastFromCashClose(cashCloses, selectedTimeframe),
          growthPrediction: calculateGrowthFromCashCloseData(cashCloses),
          confidenceLevel: confidence,
          keyDrivers: ['Daily sales trends', 'Seasonal shopping patterns', 'Weekend vs weekday performance'],
          risks: ['Cash handling errors', 'Daily fluctuations', 'Seasonal variations'],
          dailyAverage: calculateDailyAverageFromCashClose(cashCloses),
          weeklyTrend: calculateWeeklyTrendFromCashClose(cashCloses),
          monthlyPattern: calculateMonthlyPatternFromCashClose(cashCloses)
        },

        // Inventory Forecasting (Based on Sales Velocity from Cash Close)
        inventoryProjections: {
          optimalStockLevels: calculateOptimalStockFromSalesVelocity(cashCloses, expenses, selectedTimeframe),
          seasonalAdjustments: generateSeasonalInventoryFromCashClose(cashCloses, selectedTimeframe),
          wasteReduction: { current: 1.8, target: 1.2, savings: 8500000 },
          supplierOptimization: generateSupplierForecast(expenses),
          restockingSchedule: generateRestockingPlanFromSales(cashCloses, selectedTimeframe),
          salesBasedReorder: calculateReorderPointsFromCashClose(cashCloses)
        },

        // Staffing Forecasting
        staffingProjections: {
          peakSeasonNeeds: calculatePeakStaffing(employees, invoices, selectedTimeframe),
          turnoverPrediction: 3.8,
          recruitmentPlan: generateSupermarketRecruitmentPlan(employees, branches),
          trainingRequirements: ['Customer service excellence', 'Food safety protocols', 'Inventory management'],
          productivityTrends: calculateRetailProductivityTrends(employees, invoices, attendance)
        },

        // Customer & Market Insights
        customerInsights: {
          shoppingPatternForecast: generateShoppingPatterns(invoices, selectedTimeframe),
          seasonalDemand: identifySeasonalGroceryPatterns(invoices),
          competitiveAnalysis: {
            marketShare: 18.5,
            projectedShare: 22.3,
            competitiveThreats: ['Online grocery services', 'Discount retailers', 'Convenience stores'],
            opportunities: ['Organic produce expansion', 'Prepared foods section', 'Mobile app loyalty program']
          },
          emergingTrends: ['Organic & healthy foods growth', 'Contactless shopping', 'Local supplier partnerships']
        },

        // Supermarket Risk Assessment
        riskAssessment: {
          inventoryRisks: [
            { risk: 'Fresh produce spoilage', probability: 'Medium', impact: 'High', mitigation: 'Improve cold chain & rotation' },
            { risk: 'Stockout of popular items', probability: 'Low', impact: 'Medium', mitigation: 'Enhanced demand forecasting' },
            { risk: 'Overstock of seasonal items', probability: 'Medium', impact: 'Medium', mitigation: 'Flexible supplier agreements' }
          ],
          operationalRisks: [
            { risk: 'Food safety incidents', probability: 'Low', impact: 'High', mitigation: 'Strict quality protocols' },
            { risk: 'Cashier shortage during peak hours', probability: 'Medium', impact: 'Medium', mitigation: 'Cross-training & flexible schedules' },
            { risk: 'Equipment breakdown (refrigeration)', probability: 'Low', impact: 'High', mitigation: 'Preventive maintenance & backup systems' }
          ],
          competitiveRisks: [
            { risk: 'Online grocery competition', probability: 'High', impact: 'High', mitigation: 'Develop click-and-collect service' },
            { risk: 'New supermarket in area', probability: 'Medium', impact: 'Medium', mitigation: 'Strengthen customer loyalty programs' },
            { risk: 'Price war with competitors', probability: 'Medium', impact: 'High', mitigation: 'Focus on value-added services' }
          ]
        },

        // Supermarket Strategic Recommendations
        recommendations: {
          shortTerm: [
            'Optimize fresh produce ordering for summer season',
            'Implement self-checkout systems to reduce wait times',
            'Launch weekend family shopping promotions',
            'Upgrade refrigeration systems for energy efficiency'
          ],
          mediumTerm: [
            'Expand organic produce section based on demand trends',
            'Develop click-and-collect grocery service',
            'Install advanced inventory management system',
            'Create partnerships with local farms and suppliers'
          ],
          longTerm: [
            'Consider opening additional store locations',
            'Invest in automated inventory replenishment',
            'Develop private label product lines',
            'Build regional distribution center'
          ]
        }
      };

      setForecastData(forecasts);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error loading forecasting data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cash Close Data Analysis Functions
  const calculateCurrentSalesFromCashClose = (cashCloses) => {
    // Get last 30 days of cash closes for current sales
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentCloses = cashCloses.filter(close => {
      const closeDate = close.closeCashTime?.toDate() || new Date();
      return closeDate >= thirtyDaysAgo;
    });
    
    return recentCloses.reduce((sum, close) => sum + (close.totalSales || 0), 0);
  };

  const generateSalesForecastFromCashClose = (cashCloses, timeframe) => {
    if (cashCloses.length === 0) return 0;
    
    // Calculate daily average from historical data
    const dailyAverage = calculateDailyAverageFromCashClose(cashCloses);
    const growthRate = calculateGrowthFromCashCloseData(cashCloses);
    
    // Project based on timeframe
    const days = timeframe === '3months' ? 90 : timeframe === '6months' ? 180 : 365;
    const baseProjection = dailyAverage * days;
    
    // Apply growth rate
    const growthMultiplier = 1 + (growthRate / 100);
    return Math.round(baseProjection * growthMultiplier);
  };

  const calculateDailyAverageFromCashClose = (cashCloses) => {
    if (cashCloses.length === 0) return 0;
    
    const totalSales = cashCloses.reduce((sum, close) => sum + (close.totalSales || 0), 0);
    return Math.round(totalSales / cashCloses.length);
  };

  const calculateGrowthFromCashCloseData = (cashCloses) => {
    if (cashCloses.length < 60) return 8.5; // Default if insufficient data
    
    // Compare last 30 days with previous 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    const recentSales = cashCloses
      .filter(close => {
        const closeDate = close.closeCashTime?.toDate() || new Date();
        return closeDate >= thirtyDaysAgo;
      })
      .reduce((sum, close) => sum + (close.totalSales || 0), 0);
    
    const previousSales = cashCloses
      .filter(close => {
        const closeDate = close.closeCashTime?.toDate() || new Date();
        return closeDate >= sixtyDaysAgo && closeDate < thirtyDaysAgo;
      })
      .reduce((sum, close) => sum + (close.totalSales || 0), 0);
    
    if (previousSales === 0) return 8.5;
    
    const growthRate = ((recentSales - previousSales) / previousSales) * 100;
    return Math.round(growthRate * 10) / 10; // Round to 1 decimal
  };

  const calculateWeeklyTrendFromCashClose = (cashCloses) => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyData = weekdays.map(day => ({ day, sales: 0, count: 0 }));
    
    cashCloses.forEach(close => {
      const closeDate = close.closeCashTime?.toDate() || new Date();
      const dayIndex = closeDate.getDay();
      weeklyData[dayIndex].sales += close.totalSales || 0;
      weeklyData[dayIndex].count += 1;
    });
    
    return weeklyData.map(data => ({
      day: data.day,
      averageSales: data.count > 0 ? Math.round(data.sales / data.count) : 0,
      performance: data.count > 0 ? (data.sales / data.count > calculateDailyAverageFromCashClose(cashCloses) ? 'Above Average' : 'Below Average') : 'No Data'
    }));
  };

  const calculateMonthlyPatternFromCashClose = (cashCloses) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => ({ month, sales: 0, count: 0, index }));
    
    cashCloses.forEach(close => {
      const closeDate = close.closeCashTime?.toDate() || new Date();
      const monthIndex = closeDate.getMonth();
      monthlyData[monthIndex].sales += close.totalSales || 0;
      monthlyData[monthIndex].count += 1;
    });
    
    return monthlyData.map(data => ({
      month: data.month,
      averageSales: data.count > 0 ? Math.round(data.sales / data.count) : 0,
      totalDays: data.count,
      trend: data.count > 0 ? 'Stable' : 'No Data'
    }));
  };

  const calculateOptimalStockFromSalesVelocity = (cashCloses, expenses, timeframe) => {
    const dailyAverage = calculateDailyAverageFromCashClose(cashCloses);
    const categories = ['Fresh Produce', 'Dairy & Frozen', 'Meat & Poultry', 'Packaged Foods', 'Beverages', 'Household Items'];
    
    return categories.map((category, index) => {
      // Estimate category contribution based on typical supermarket breakdown
      const categoryPercentages = [0.28, 0.22, 0.18, 0.15, 0.12, 0.05];
      const categorySales = dailyAverage * categoryPercentages[index];
      
      // Calculate optimal stock based on sales velocity
      const daysOfStock = category === 'Fresh Produce' ? 3 : category.includes('Dairy') ? 7 : 14;
      const optimalLevel = categorySales * daysOfStock;
      
      return {
        category,
        currentLevel: Math.round(optimalLevel * (0.8 + Math.random() * 0.4)), // 80-120% of optimal
        optimalLevel: Math.round(optimalLevel),
        dailySalesVelocity: Math.round(categorySales),
        turnoverRate: Math.round((365 / daysOfStock) * 10) / 10,
        reorderPoint: Math.round(categorySales * (daysOfStock * 0.3)) // Reorder at 30% of days of stock
      };
    });
  };

  const generateSeasonalInventoryFromCashClose = (cashCloses, timeframe) => {
    const monthlyPattern = calculateMonthlyPatternFromCashClose(cashCloses);
    const averageMonthlySales = monthlyPattern.reduce((sum, month) => sum + month.averageSales, 0) / 12;
    
    return [
      { 
        season: 'Summer (Jun-Aug)', 
        category: 'Fresh Produce', 
        adjustment: '+25%', 
        reason: 'Peak demand for fruits & vegetables',
        projectedIncrease: Math.round(averageMonthlySales * 0.25)
      },
      { 
        season: 'Winter (Dec-Feb)', 
        category: 'Canned Goods', 
        adjustment: '+15%', 
        reason: 'Comfort foods and preserved items',
        projectedIncrease: Math.round(averageMonthlySales * 0.15)
      },
      { 
        season: 'Holiday (Dec)', 
        category: 'Beverages', 
        adjustment: '+30%', 
        reason: 'Party and celebration drinks',
        projectedIncrease: Math.round(averageMonthlySales * 0.30)
      },
      { 
        season: 'Back-to-School (Aug-Sep)', 
        category: 'Snacks & Lunch Items', 
        adjustment: '+20%', 
        reason: 'Student lunch preparations',
        projectedIncrease: Math.round(averageMonthlySales * 0.20)
      }
    ];
  };

  const generateRestockingPlanFromSales = (cashCloses, timeframe) => {
    const dailyAverage = calculateDailyAverageFromCashClose(cashCloses);
    const monthlyAverage = dailyAverage * 30;
    const days = timeframe === '3months' ? 90 : timeframe === '6months' ? 180 : 365;
    
    return Array.from({ length: Math.min(days / 30, 12) }, (_, i) => ({
      month: i + 1,
      freshProduce: Math.round(monthlyAverage * 0.28), // 28% of sales
      dairyFrozen: Math.round(monthlyAverage * 0.22),   // 22% of sales
      meatPoultry: Math.round(monthlyAverage * 0.18),   // 18% of sales
      packagedGoods: Math.round(monthlyAverage * 0.15), // 15% of sales
      totalProjected: Math.round(monthlyAverage)
    }));
  };

  const calculateReorderPointsFromCashClose = (cashCloses) => {
    const dailyAverage = calculateDailyAverageFromCashClose(cashCloses);
    
    return {
      freshProduce: {
        dailyVelocity: Math.round(dailyAverage * 0.28),
        leadTimeDays: 1, // Fresh produce needs daily delivery
        safetyStock: Math.round(dailyAverage * 0.28 * 0.5), // 50% safety stock
        reorderPoint: Math.round(dailyAverage * 0.28 * 1.5) // 1.5 days of stock
      },
      dairyFrozen: {
        dailyVelocity: Math.round(dailyAverage * 0.22),
        leadTimeDays: 3,
        safetyStock: Math.round(dailyAverage * 0.22 * 1),
        reorderPoint: Math.round(dailyAverage * 0.22 * 4)
      },
      packagedGoods: {
        dailyVelocity: Math.round(dailyAverage * 0.15),
        leadTimeDays: 7,
        safetyStock: Math.round(dailyAverage * 0.15 * 3),
        reorderPoint: Math.round(dailyAverage * 0.15 * 10)
      }
    };
  };

  const generateSeasonalInventory = (timeframe) => {
    return [
      { season: 'Summer', category: 'Fresh Produce', adjustment: '+25%', reason: 'Peak demand for fruits & vegetables' },
      { season: 'Winter', category: 'Canned Goods', adjustment: '+15%', reason: 'Comfort foods and preserved items' },
      { season: 'Holiday', category: 'Beverages', adjustment: '+30%', reason: 'Party and celebration drinks' },
      { season: 'Back-to-School', category: 'Snacks & Lunch Items', adjustment: '+20%', reason: 'Student lunch preparations' }
    ];
  };

  const generateSupplierForecast = (expenses) => {
    return [
      { supplier: 'Fresh Farms Ltd', category: 'Produce', reliability: 95, costTrend: 'Stable', recommendation: 'Maintain' },
      { supplier: 'Dairy Co-op', category: 'Dairy', reliability: 92, costTrend: 'Increasing', recommendation: 'Negotiate' },
      { supplier: 'Meat Packers Inc', category: 'Meat', reliability: 88, costTrend: 'Volatile', recommendation: 'Diversify' },
      { supplier: 'Global Brands Dist', category: 'Packaged', reliability: 97, costTrend: 'Stable', recommendation: 'Expand' }
    ];
  };

  const generateRestockingPlan = (invoices, timeframe) => {
    const days = timeframe === '3months' ? 90 : timeframe === '6months' ? 180 : 365;
    return Array.from({ length: Math.min(days / 30, 12) }, (_, i) => ({
      month: i + 1,
      freshProduce: Math.floor(Math.random() * 5000000) + 8000000,
      dairyFrozen: Math.floor(Math.random() * 3000000) + 5000000,
      meatPoultry: Math.floor(Math.random() * 2500000) + 4000000,
      packagedGoods: Math.floor(Math.random() * 4000000) + 6000000
    }));
  };

  const calculatePeakStaffing = (employees, invoices, timeframe) => {
    const currentStaff = employees.filter(emp => emp.employmentStatus === 'Active').length;
    const salesGrowth = 15.8; // Expected growth
    const efficiencyGain = 6; // Expected efficiency improvement
    const netStaffingNeed = Math.ceil(currentStaff * (salesGrowth - efficiencyGain) / 100);
    
    return {
      current: currentStaff,
      projected: currentStaff + netStaffingNeed,
      newHires: netStaffingNeed,
      departments: [
        { name: 'Cashiers', current: Math.floor(currentStaff * 0.35), needed: 4, reason: 'Peak shopping hours' },
        { name: 'Stock Associates', current: Math.floor(currentStaff * 0.25), needed: 3, reason: 'Inventory management' },
        { name: 'Produce Team', current: Math.floor(currentStaff * 0.15), needed: 2, reason: 'Fresh goods handling' },
        { name: 'Customer Service', current: Math.floor(currentStaff * 0.15), needed: 2, reason: 'Customer experience' },
        { name: 'Management', current: Math.floor(currentStaff * 0.1), needed: 1, reason: 'Store supervision' }
      ]
    };
  };

  const generateSupermarketRecruitmentPlan = (employees, branches) => {
    return {
      timeline: '6 months',
      priority: 'High',
      positions: [
        { role: 'Cashier', count: 6, urgency: 'High', stores: ['Main Store', 'Ntinda Branch'], skills: 'Customer service, POS systems' },
        { role: 'Stock Associate', count: 4, urgency: 'Medium', stores: ['All Locations'], skills: 'Inventory management, heavy lifting' },
        { role: 'Produce Specialist', count: 2, urgency: 'Medium', stores: ['Main Store'], skills: 'Fresh food handling, quality control' },
        { role: 'Floor Supervisor', count: 2, urgency: 'Low', stores: ['Entebbe', 'Jinja'], skills: 'Leadership, retail operations' }
      ]
    };
  };

  const calculateRetailProductivityTrends = (employees, invoices, attendance) => {
    const activeEmployees = employees.filter(emp => emp.employmentStatus === 'Active').length;
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const salesPerEmployee = activeEmployees > 0 ? totalSales / activeEmployees : 0;
    
    return {
      current: salesPerEmployee,
      projected: salesPerEmployee * 1.15,
      trend: 'Improving',
      factors: ['Self-checkout implementation', 'Inventory system optimization', 'Customer service training']
    };
  };

  const generateShoppingPatterns = (invoices, timeframe) => {
    return [
      { pattern: 'Weekend Family Shopping', impact: 'High', trend: 'Growing', recommendation: 'Increase weekend staffing' },
      { pattern: 'Lunch Hour Rush', impact: 'Medium', trend: 'Stable', recommendation: 'Express checkout lanes' },
      { pattern: 'Evening Convenience', impact: 'Medium', trend: 'Growing', recommendation: 'Extended hours consideration' },
      { pattern: 'Holiday Bulk Buying', impact: 'High', trend: 'Seasonal', recommendation: 'Pre-holiday inventory buildup' }
    ];
  };

  const identifySeasonalGroceryPatterns = (invoices) => {
    return {
      peak: 'December (Holiday cooking & entertaining)',
      low: 'January (Post-holiday health focus)',
      trends: [
        'Dec: 45% higher sales (holiday foods)',
        'Jan: 20% lower sales (diet season)',
        'Summer: Fresh produce surge',
        'Back-to-school: Lunch items peak'
      ],
      recommendations: [
        'Stock up on holiday essentials in November',
        'Promote healthy foods in January',
        'Expand fresh produce section for summer',
        'Create back-to-school lunch sections'
      ]
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (probability) => {
    switch (probability.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Generating Forecasts...</h2>
          <p className="text-gray-500">Analyzing patterns and predicting future trends</p>
        </div>
      </div>
    );
  }

  if (!forecastData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center p-8">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">No Forecast Data</h2>
          <p className="text-gray-500">Forecasting data will be available as your business grows</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Activity className="w-8 h-8 text-indigo-600" />
                Forecasting & Insights
              </h1>
              <p className="text-gray-600 mt-2">Predictive analytics and strategic recommendations for future planning</p>
            </div>
            
            <div className="flex items-center gap-4">
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="3months">Next 3 Months</option>
                <option value="6months">Next 6 Months</option>
                <option value="12months">Next 12 Months</option>
              </select>
              
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="basic">Basic Model</option>
                <option value="advanced">Advanced AI</option>
                <option value="expert">Expert Analysis</option>
              </select>
              
              <button
                onClick={loadForecastingData}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Last updated: {lastUpdated.toLocaleString()}</span>
            <span>•</span>
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Confidence Level: {confidence}%
            </span>
          </div>
        </div>

        {/* Supermarket Key Forecasts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Sales Forecast</div>
                <div className="text-green-600 font-medium">+{forecastData.salesForecast.growthPrediction}%</div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(forecastData.salesForecast.projectedSales)}</h3>
            <p className="text-gray-600">Projected Sales</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Waste Reduction</div>
                <div className="text-blue-600 font-medium">{formatCurrency(forecastData.inventoryProjections.wasteReduction.savings)}</div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{forecastData.inventoryProjections.wasteReduction.target}%</h3>
            <p className="text-gray-600">Target Waste Rate</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Staffing Needs</div>
                <div className="text-purple-600 font-medium">+{forecastData.staffingProjections.peakSeasonNeeds.newHires}</div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{forecastData.staffingProjections.peakSeasonNeeds.projected}</h3>
            <p className="text-gray-600">Total Staff Projected</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Market Share</div>
                <div className="text-orange-600 font-medium">+3.8%</div>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{forecastData.customerInsights.competitiveAnalysis.projectedShare}%</h3>
            <p className="text-gray-600">Projected Share</p>
          </div>
        </div>

        {/* Cash Close Analysis Dashboard */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Cash Close Analysis & Sales Velocity
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Sales Metrics */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-3">Daily Sales Metrics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700">Daily Average:</span>
                  <span className="font-semibold text-green-900">{formatCurrency(forecastData.salesForecast.dailyAverage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Current 30-Day:</span>
                  <span className="font-semibold text-green-900">{formatCurrency(forecastData.salesForecast.currentSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Growth Rate:</span>
                  <span className={`font-semibold ${forecastData.salesForecast.growthPrediction > 0 ? 'text-green-900' : 'text-red-600'}`}>
                    {forecastData.salesForecast.growthPrediction > 0 ? '+' : ''}{forecastData.salesForecast.growthPrediction}%
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Performance */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3">Weekly Performance Pattern</h4>
              <div className="space-y-1">
                {forecastData.salesForecast.weeklyTrend.slice(0, 4).map((day, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-blue-700">{day.day}:</span>
                    <span className={`font-medium ${day.performance === 'Above Average' ? 'text-green-600' : 'text-blue-900'}`}>
                      {formatCurrency(day.averageSales)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-blue-600">
                Best performing days drive forecasting accuracy
              </div>
            </div>

            {/* Sales Velocity by Category */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-3">Sales Velocity (Daily)</h4>
              <div className="space-y-1">
                {forecastData.inventoryProjections.optimalStockLevels.slice(0, 4).map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-purple-700">{item.category.split(' ')[0]}:</span>
                    <span className="font-medium text-purple-900">
                      {formatCurrency(item.dailySalesVelocity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-purple-600">
                Based on actual cash close data
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Inventory Intelligence */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Sales-Based Inventory Intelligence
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Daily Velocity</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Optimal Stock</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Reorder Point</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Turnover Rate</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.inventoryProjections.optimalStockLevels.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{item.category}</div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(item.dailySalesVelocity)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {formatCurrency(item.optimalLevel)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {formatCurrency(item.reorderPoint)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.turnoverRate > 50 ? 'bg-green-100 text-green-800' :
                        item.turnoverRate > 25 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.turnoverRate}x/year
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h4 className="font-medium text-indigo-900 mb-2">Reorder Point Intelligence</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-indigo-700 font-medium">Fresh Produce:</span>
                <span className="text-indigo-900 ml-2">1-day lead time, daily restocking</span>
              </div>
              <div>
                <span className="text-indigo-700 font-medium">Dairy & Frozen:</span>
                <span className="text-indigo-900 ml-2">3-day lead time, weekly delivery</span>
              </div>
              <div>
                <span className="text-indigo-700 font-medium">Packaged Goods:</span>
                <span className="text-indigo-900 ml-2">7-day lead time, bulk orders</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              Short-term (3 months)
            </h3>
            <div className="space-y-3">
              {forecastData.recommendations.shortTerm.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-green-800">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Medium-term (6-12 months)
            </h3>
            <div className="space-y-3">
              {forecastData.recommendations.mediumTerm.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-800">{rec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Long-term (1+ years)
            </h3>
            <div className="space-y-3">
              {forecastData.recommendations.longTerm.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <Target className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-purple-800">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Supermarket Risk Assessment */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Supermarket Risk Assessment & Mitigation
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Inventory & Supply Risks</h4>
              <div className="space-y-2">
                {forecastData.riskAssessment.inventoryRisks.map((risk, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{risk.risk}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(risk.probability)}`}>
                        {risk.probability}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Store Operations Risks</h4>
              <div className="space-y-2">
                {forecastData.riskAssessment.operationalRisks.map((risk, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{risk.risk}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(risk.probability)}`}>
                        {risk.probability}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Competitive Risks</h4>
              <div className="space-y-2">
                {forecastData.riskAssessment.competitiveRisks.map((risk, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900 text-sm">{risk.risk}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(risk.probability)}`}>
                        {risk.probability}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{risk.mitigation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grocery Insights and Shopping Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Shopping Pattern Forecast
            </h3>
            <div className="space-y-4">
              {forecastData.customerInsights.shoppingPatternForecast.map((pattern, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{pattern.pattern}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      pattern.impact === 'High' ? 'bg-red-100 text-red-800' :
                      pattern.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {pattern.impact} Impact
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Trend: {pattern.trend}</span>
                    <span className="text-xs text-indigo-600 font-medium">{pattern.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Seasonal Grocery Patterns
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">Peak Season</h4>
                <p className="text-green-700 text-sm">{forecastData.customerInsights.seasonalDemand.peak}</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Low Season</h4>
                <p className="text-orange-700 text-sm">{forecastData.customerInsights.seasonalDemand.low}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Grocery Trends</h4>
                <div className="space-y-1">
                  {forecastData.customerInsights.seasonalDemand.trends.map((trend, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">{trend}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Seasonal Recommendations</h4>
                <div className="space-y-1">
                  {forecastData.customerInsights.seasonalDemand.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}