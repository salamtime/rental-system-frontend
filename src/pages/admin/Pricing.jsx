import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import EnhancedBasePriceEditor from '../../components/pricing/EnhancedBasePriceEditor';
import TransportFeesEditor from '../../components/pricing/TransportFeesEditor';
import DailyTiersEditor from '../../components/pricing/DailyTiersEditor';
import PricingCalculator from '../../components/pricing/PricingCalculator';
import SeasonalPricingEditor from '../../components/pricing/SeasonalPricingEditor';
import DiscountManager from '../../components/pricing/DiscountManager';
import DynamicPricingCalculator from '../../components/pricing/DynamicPricingCalculator';
import RevenueAnalytics from '../../components/pricing/RevenueAnalytics';
import { 
  DollarSign, Settings, Calculator, TrendingUp, Calendar, 
  Percent, BarChart3, Zap, Target, Award, Truck 
} from 'lucide-react';

const Pricing = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dynamic Pricing Management</h1>
          <p className="text-gray-600 mt-1">
            Advanced pricing system with seasonal rates, discounts, and revenue optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-yellow-600" />
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Base Pricing</p>
                <p className="text-2xl font-bold">Active</p>
              </div>
              <Settings className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Daily Tiers</p>
                <p className="text-2xl font-bold">Optimized</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Seasonal Rules</p>
                <p className="text-2xl font-bold">Dynamic</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Discounts</p>
                <p className="text-2xl font-bold">Smart</p>
              </div>
              <Percent className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Analytics</p>
                <p className="text-2xl font-bold">Real-time</p>
              </div>
              <BarChart3 className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="base-prices" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="base-prices" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Base Prices
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="dynamic-calculator" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Dynamic Calculator
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Seasonal
          </TabsTrigger>
          <TabsTrigger value="discounts" className="flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Discounts
          </TabsTrigger>
          <TabsTrigger value="daily-tiers" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Daily Tiers
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Basic Calculator
          </TabsTrigger>
        </TabsList>

        <TabsContent value="base-prices" className="space-y-6">
          {/* Base Pricing Rules Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Base Pricing Rules</h3>
            <p className="text-sm text-gray-700">
              Configure base pricing for rentals and transport services. These settings serve as the foundation 
              for all pricing calculations across the platform.
            </p>
          </div>

          <div className="space-y-6">
            {/* Rental Pricing Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-gray-900">Rental</h4>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  Set hourly, daily, and weekly base prices for each vehicle model. These serve as the single source of truth 
                  for rental pricing and automatically populate the rental form based on model selection.
                </p>
              </div>
              <EnhancedBasePriceEditor key={`base-${refreshKey}`} onUpdate={handleUpdate} />
            </div>

            {/* Transport Fees Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-gray-900">Transport Fees</h4>
              </div>
              <TransportFeesEditor key={`transport-${refreshKey}`} onUpdate={handleUpdate} />
            </div>

            {/* Future Sections Placeholder */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-400 mb-2">
                <DollarSign className="w-8 h-8 mx-auto mb-2" />
              </div>
              <h4 className="text-lg font-medium text-gray-500 mb-2">Future Pricing Sections</h4>
              <p className="text-sm text-gray-400">
                Tours and Bookings price management will be added here in future updates.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h3 className="font-semibold text-lg">Revenue Analytics Dashboard</h3>
            </div>
            <p className="text-sm text-gray-700">
              Track pricing performance, revenue trends, seasonal impacts, and discount effectiveness. 
              Get actionable insights to optimize your pricing strategy and maximize revenue.
            </p>
          </div>
          <RevenueAnalytics />
        </TabsContent>

        <TabsContent value="dynamic-calculator" className="space-y-6">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-6 h-6 text-yellow-600" />
              <h3 className="font-semibold text-lg">Dynamic Pricing Calculator</h3>
            </div>
            <p className="text-sm text-gray-700">
              Calculate prices with all dynamic factors: seasonal multipliers, discount rules, customer types, 
              and advance booking conditions. See exactly how each factor affects the final price.
            </p>
          </div>
          <DynamicPricingCalculator key={`dynamic-calc-${refreshKey}`} />
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-6">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-6 h-6 text-orange-600" />
              <h3 className="font-semibold text-lg">Seasonal Pricing Management</h3>
            </div>
            <p className="text-sm text-gray-700">
              Set up seasonal rate multipliers for peak, high, normal, and low seasons. Configure holiday premiums 
              and special event pricing to maximize revenue during high-demand periods.
            </p>
          </div>
          <SeasonalPricingEditor key={`seasonal-${refreshKey}`} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="discounts" className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border">
            <div className="flex items-center gap-3 mb-3">
              <Percent className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-lg">Advanced Discount System</h3>
            </div>
            <p className="text-sm text-gray-700">
              Create sophisticated discount rules: early bird discounts, last-minute deals, loyalty rewards, 
              group bookings, and multi-day rental incentives. Boost conversions and customer retention.
            </p>
          </div>
          <DiscountManager key={`discounts-${refreshKey}`} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="daily-tiers" className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Daily Duration Discount Tiers</h3>
            <p className="text-sm text-gray-700">
              Create pricing tiers based on rental duration. Longer rentals can have lower per-day rates 
              to encourage extended bookings. Example: 1 day = $500/day, 2 days = $400/day, 3+ days = $350/day.
            </p>
          </div>
          <DailyTiersEditor key={`tiers-${refreshKey}`} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Basic Pricing Calculator</h3>
            <p className="text-sm text-gray-700">
              Calculate rental prices for any vehicle model and date range. The system automatically 
              applies the best available pricing tier based on the rental duration.
            </p>
          </div>
          <PricingCalculator key={`calc-${refreshKey}`} />
        </TabsContent>
      </Tabs>

      {/* Enhanced Help Section */}
      <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="text-yellow-800 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Advanced Pricing Strategy Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-yellow-700">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Revenue Optimization
              </h4>
              <ul className="space-y-1">
                <li>• Use seasonal multipliers for peak demand periods</li>
                <li>• Implement dynamic pricing based on occupancy</li>
                <li>• Monitor competitor pricing regularly</li>
                <li>• Analyze booking patterns for optimization</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Discount Strategy
              </h4>
              <ul className="space-y-1">
                <li>• Early bird discounts increase advance bookings</li>
                <li>• Last-minute deals fill inventory gaps</li>
                <li>• Loyalty programs improve customer retention</li>
                <li>• Group discounts boost volume sales</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance Tracking
              </h4>
              <ul className="space-y-1">
                <li>• Track revenue per available vehicle</li>
                <li>• Monitor discount effectiveness</li>
                <li>• Analyze seasonal performance trends</li>
                <li>• Optimize pricing based on data insights</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pricing;