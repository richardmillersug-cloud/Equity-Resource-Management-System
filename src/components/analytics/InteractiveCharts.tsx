'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler
);

interface MonthlyRevenueChartProps {
  data: Array<{
    month: string;
    year: number;
    revenue: number;
    transactions: number;
  }>;
}

export const MonthlyRevenueChart: React.FC<MonthlyRevenueChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map(d => `${d.month} ${d.year}`),
    datasets: [
      {
        label: 'Revenue (UGX)',
        data: data.map(d => d.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Transactions',
        data: data.map(d => d.transactions),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        yAxisID: 'y1',
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: '📈 Monthly Revenue & Transaction Trends',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 0) {
              return `Revenue: ${context.parsed.y.toLocaleString()} UGX`;
            } else {
              return `Transactions: ${context.parsed.y.toLocaleString()}`;
            }
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Revenue (UGX)',
          font: {
            size: 14,
            weight: 'bold'
          },
          color: 'rgb(59, 130, 246)'
        },
        grid: {
          color: 'rgba(59, 130, 246, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString() + ' UGX';
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Transactions',
          font: {
            size: 14,
            weight: 'bold'
          },
          color: 'rgb(16, 185, 129)'
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString();
          }
        }
      }
    },
    elements: {
      point: {
        hoverBackgroundColor: '#fff'
      }
    }
  };

  return (
    <div className="h-96 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

interface TopProductsChartProps {
  products: Array<{
    ref: string;
    description: string;
    totalRevenue: number;
    totalUnits: number;
  }>;
}

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ products }) => {
  const top10 = products.slice(0, 10);
  
  const chartData = {
    labels: top10.map(p => p.description.length > 20 ? p.description.substring(0, 20) + '...' : p.description),
    datasets: [
      {
        label: 'Revenue (UGX)',
        data: top10.map(p => p.totalRevenue),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(199, 199, 199, 0.8)',
          'rgba(83, 102, 255, 0.8)',
          'rgba(255, 99, 255, 0.8)',
          'rgba(99, 255, 132, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(83, 102, 255, 1)',
          'rgba(255, 99, 255, 1)',
          'rgba(99, 255, 132, 1)'
        ]
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          },
          generateLabels: function(chart: any) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label: string, i: number) => {
                const revenue = data.datasets[0].data[i];
                return {
                  text: `${label}: ${revenue.toLocaleString()} UGX`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: data.datasets[0].borderWidth,
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      title: {
        display: true,
        text: '🏆 Top 10 Products by Revenue',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const product = top10[context.dataIndex];
            return [
              `Revenue: ${context.parsed.toLocaleString()} UGX`,
              `Units: ${product.totalUnits.toLocaleString()}`,
              `ID: ${product.ref}`
            ];
          }
        }
      }
    }
  };

  return (
    <div className="h-96 w-full">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

interface GrowthAnalysisChartProps {
  growthData: Array<{
    from: string;
    to: string;
    revenueGrowth: string;
    revenueDifference: number;
    transactionGrowth: string;
  }>;
}

export const GrowthAnalysisChart: React.FC<GrowthAnalysisChartProps> = ({ growthData }) => {
  const chartData = {
    labels: growthData.map(g => `${g.from} → ${g.to}`),
    datasets: [
      {
        label: 'Revenue Growth (%)',
        data: growthData.map(g => parseFloat(g.revenueGrowth)),
        backgroundColor: growthData.map(g => 
          parseFloat(g.revenueGrowth) >= 0 
            ? 'rgba(34, 197, 94, 0.8)' 
            : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: growthData.map(g => 
          parseFloat(g.revenueGrowth) >= 0 
            ? 'rgba(34, 197, 94, 1)' 
            : 'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Transaction Growth (%)',
        data: growthData.map(g => parseFloat(g.transactionGrowth)),
        backgroundColor: growthData.map(g => 
          parseFloat(g.transactionGrowth) >= 0 
            ? 'rgba(59, 130, 246, 0.8)' 
            : 'rgba(251, 146, 60, 0.8)'
        ),
        borderColor: growthData.map(g => 
          parseFloat(g.transactionGrowth) >= 0 
            ? 'rgba(59, 130, 246, 1)' 
            : 'rgba(251, 146, 60, 1)'
        ),
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: '📊 Month-over-Month Growth Analysis',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const growth = growthData[context.dataIndex];
            if (context.datasetIndex === 0) {
              return [
                `Revenue Growth: ${context.parsed.y}%`,
                `Amount Change: ${growth.revenueDifference >= 0 ? '+' : ''}${growth.revenueDifference.toLocaleString()} UGX`
              ];
            } else {
              return `Transaction Growth: ${context.parsed.y}%`;
            }
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Comparison Period',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 45,
          font: {
            size: 10
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Growth Percentage (%)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  return (
    <div className="h-96 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

interface BranchComparisonChartProps {
  branchData: Array<{
    month: string;
    year: number;
    branches: {
      MAINSHOP: { revenue: number; transactions: number };
      SHOP2: { revenue: number; transactions: number };
    };
  }>;
}

export const BranchComparisonChart: React.FC<BranchComparisonChartProps> = ({ branchData }) => {
  const chartData = {
    labels: branchData.map(d => `${d.month} ${d.year}`),
    datasets: [
      {
        label: 'MAINSHOP Revenue',
        data: branchData.map(d => d.branches.MAINSHOP.revenue),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'SHOP2 Revenue',
        data: branchData.map(d => d.branches.SHOP2.revenue),
        backgroundColor: 'rgba(236, 72, 153, 0.8)',
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: '🏪 Branch Performance Comparison',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 30
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const monthData = branchData[context.dataIndex];
            const branchName = context.dataset.label.split(' ')[0];
            const branchInfo = branchName === 'MAINSHOP' 
              ? monthData.branches.MAINSHOP 
              : monthData.branches.SHOP2;
            
            return [
              `${branchName} Revenue: ${context.parsed.y.toLocaleString()} UGX`,
              `${branchName} Transactions: ${branchInfo.transactions.toLocaleString()}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Month',
          font: {
            size: 14,
            weight: 'bold'
          }
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Revenue (UGX)',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString() + ' UGX';
          }
        }
      }
    }
  };

  return (
    <div className="h-96 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};