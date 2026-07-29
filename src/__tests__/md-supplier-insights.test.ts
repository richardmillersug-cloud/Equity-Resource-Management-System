import {
  buildMdSystemAnalytics,
  buildMdSystemForecast,
} from '@/lib/firebase/md-supplier-insights';

describe('md-supplier-insights', () => {
  const now = new Date(2026, 6, 15); // 15 Jul 2026

  const suppliers = [
    {
      id: 's1',
      supplierName: 'Fresh Farms',
      isActive: true,
      routeDays: ['Monday', 'Thursday'],
    },
    {
      id: 's2',
      supplierName: 'Dry Goods Co',
      isActive: true,
      routeDays: ['Wednesday'],
    },
  ];

  const invoices = [
    {
      id: 'i1',
      supplierId: 's1',
      supplierName: 'Fresh Farms',
      amount: 1000000,
      date: new Date(2026, 6, 3),
    },
    {
      id: 'i2',
      supplierId: 's1',
      supplierName: 'Fresh Farms',
      amount: 500000,
      date: new Date(2026, 5, 10),
    },
  ];

  const cashCloses = [
    { id: 'c1', totalSales: 8000000, closeCashTime: new Date(2026, 6, 1) },
    { id: 'c2', totalSales: 7000000, closeCashTime: new Date(2026, 5, 15) },
  ];

  it('builds analytics from suppliers and invoices only', () => {
    const analytics = buildMdSystemAnalytics({
      suppliers,
      invoices,
      cashCloses,
      expenses: [],
      employees: [{ employmentStatus: 'Active' }],
      branches: [{ id: 'b1' }],
      period: 'quarterly',
      now,
    });

    expect(analytics.suppliersTotal).toBe(2);
    expect(analytics.suppliersWithRoute).toBe(2);
    expect(analytics.topSuppliersBySpend[0].name).toBe('Fresh Farms');
    expect(analytics.topSuppliersBySpend[0].invoiceCount).toBeGreaterThan(0);
    expect(analytics.routeDayCoverage.find((d) => d.day === 'Monday')?.supplierCount).toBe(1);
    // No invented categories
    expect((analytics as any).retailInsights).toBeUndefined();
  });

  it('builds forecast schedule from route days and invoice weekdays', () => {
    const forecast = buildMdSystemForecast({
      suppliers,
      invoices: [
        ...invoices,
        // Fridays only — should appear via invoice pattern (no Friday on routeDays)
        {
          id: 'i3',
          supplierId: 's2',
          supplierName: 'Dry Goods Co',
          amount: 200000,
          date: new Date(2026, 6, 10), // Friday
        },
        {
          id: 'i4',
          supplierId: 's2',
          supplierName: 'Dry Goods Co',
          amount: 250000,
          date: new Date(2026, 6, 3), // Friday
        },
      ],
      cashCloses,
      timeframe: '3months',
      now,
    });

    expect(forecast.monthsAhead).toBe(3);
    expect(forecast.upcomingRouteSchedule.length).toBeGreaterThan(0);
    expect(forecast.upcomingRouteSchedule.some((s) => s.suppliers.some((x) => x.id === 's1'))).toBe(
      true
    );

    const fridaySlots = forecast.upcomingRouteSchedule.filter((s) => s.day === 'Friday');
    expect(fridaySlots.length).toBeGreaterThan(0);
    expect(
      fridaySlots.some((s) =>
        s.suppliers.some((x) => x.id === 's2' && (x.source === 'invoice' || x.source === 'both'))
      )
    ).toBe(true);
  });
});