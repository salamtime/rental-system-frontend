import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import SeasonalPricingService from '../../services/SeasonalPricingService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, Users, 
  Target, Award, AlertCircle, RefreshCw 
} from 'lucide-react';

const RevenueAnalytics = () => {
  const [analytics, setAnalytics] = useState([]);
  const [revenueMetrics, setRevenueMetrics] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  const mockRevenueData = [
    { date: '2024-01-01', revenue: 12500, bookings: 25, avgPrice: 500 },
    { date: '2024-01-02', revenue: 15200, bookings: 32, avgPrice: 475 },
    { date: '2024-01-03', revenue: 18900, bookings: 38, avgPrice: 497 },
    { date: '2024-01-04', revenue: 14300, bookings: 29, avgPrice: 493 },
    { date: '2024-01-05', revenue: 16800, bookings: 35, avgPrice: 480 },
    { date: '2024-01-06', revenue: 21200, bookings: 42, avgPrice: 505 },
    { date: '2024-01-07', revenue: 19500, bookings: 39, avgPrice: 500 }
  ];

  const mockSeasonalData = [
    { season: 'Peak Season', revenue: 85000, percentage: 35, color: '#ef4444' },
    { season: 'High Season', revenue: 65000, percentage: 27, color: '#f97316' },
    { season: 'Normal Season', revenue: 58000, percentage: 24, color: '#3b82f6' },
    { season: 'Low Season', revenue: 34000, percentage: 14, color: '#10b981' }
  ];

  const mockDiscountEffectiveness = [
    { type: 'Early Bird', usage: 145, savings: 8500, avgDiscount: 12 },
    { type: 'Multi-Day', usage: 89, savings: 12300, avgDiscount: 15 },
    { type: 'Last Minute', usage: 67, savings: 4200, avgDiscount: 8 },
    { type: 'Loyalty', usage: 234, savings: 18900, avgDiscount: 10 },
    { type: 'Group Booking', usage: 23, savings: 5600, avgDiscount: 20 }
  ];

  const kpiData = [
    {
      title: 'Total Revenue',
      value: '$242,500',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Average Booking Value',
      value: '$487',
      change: '+3.2%',
      trend: 'up',
      icon: Target,
      color: 'blue'
    },
    {
      title: 'Occupancy Rate',
      value: '78.5%',
      change: '+5.8%',
      trend: 'up',
      icon: Calendar,
      color: 'purple'
    },
    {
      title: 'Customer Retention',
      value: '64.2%',
      change: '-2.1%',
      trend: 'down',
      icon: Users,
      color: 'orange'
    }
  ];

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // In a real implementation, these would be actual API calls
      // const [analyticsData, metricsData] = await Promise.all([
      //   SeasonalPricingService.getPricingAnalytics(startDate, endDate),
      //   SeasonalPricingService.getRevenueMetrics(period)
      // ]);
      
      // Using mock data for demonstration
      setAnalytics(mockRevenueData);
      setRevenueMetrics(mockRevenueData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getTrendIcon = (trend) => {
    return trend === 'up' ? TrendingUp : TrendingDown;
  };

  const getTrendColor = (trend) => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
          <p className="text-gray-600">Track pricing performance and revenue optimization</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon;
          const TrendIcon = getTrendIcon(kpi.trend);
          
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(kpi.trend)}`}>
                      <TrendIcon className="w-4 h-4" />
                      {kpi.change}
                    </div>
                  </div>
                  <Icon className={`w-8 h-8 text-${kpi.color}-600`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={mockRevenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'revenue' ? 'Revenue' : 'Bookings'
                ]}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Revenue Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Seasonal Revenue Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockSeasonalData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                  label={({ season, percentage }) => `${season}: ${percentage}%`}
                >
                  {mockSeasonalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Booking Volume vs Average Price */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings vs Average Price</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'avgPrice' ? formatCurrency(value) : value,
                    name === 'avgPrice' ? 'Avg Price' : 'Bookings'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="bookings" fill="#10b981" name="Bookings" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="avgPrice" 
                  stroke="#f59e0b" 
                  strokeWidth={3}
                  name="Avg Price"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Discount Effectiveness */}
      <Card>
        <CardHeader>
          <CardTitle>Discount Effectiveness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockDiscountEffectiveness.map((discount, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{discount.type} Discount</h4>
                    <p className="text-sm text-gray-600">{discount.usage} times used</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(discount.savings)} saved</p>
                  <p className="text-sm text-gray-600">Avg: {discount.avgDiscount}% off</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Pricing Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-blue-700">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 mt-0.5 text-green-600" />
              <div>
                <p className="font-semibold">Increase Peak Season Rates</p>
                <p className="text-sm">Your occupancy rate during peak season is 95%. Consider increasing rates by 10-15%.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 text-orange-600" />
              <div>
                <p className="font-semibold">Optimize Multi-Day Discounts</p>
                <p className="text-sm">Multi-day rentals show high conversion. Consider increasing the discount to boost longer bookings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 mt-0.5 text-purple-600" />
              <div>
                <p className="font-semibold">Low Season Promotion</p>
                <p className="text-sm">Low season occupancy is only 45%. Implement aggressive pricing or promotional campaigns.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueAnalytics;