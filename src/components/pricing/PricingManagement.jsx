import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Settings, Calculator, TrendingUp, Database, BarChart3, Wrench } from 'lucide-react';
import BasePriceEditor from './BasePriceEditor';
import DailyTiersEditor from './DailyTiersEditor';
import SeasonalPricingEditor from './SeasonalPricingEditor';
import DiscountManager from './DiscountManager';
import DynamicPricingCalculator from './DynamicPricingCalculator';
import PricingCalculator from './PricingCalculator';
import RevenueAnalytics from './RevenueAnalytics';
import DatabaseSetup from '../admin/DatabaseSetup';
import DirectDatabaseFix from '../admin/DirectDatabaseFix';

const PricingManagement = () => {
  const [activeTab, setActiveTab] = useState('calculator');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dynamic Pricing Management</h1>
          <p className="text-gray-600 mt-2">Manage vehicle pricing, discounts, and revenue optimization</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="dynamic" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Dynamic
          </TabsTrigger>
          <TabsTrigger value="base-pricing" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Base Pricing
          </TabsTrigger>
          <TabsTrigger value="daily-tiers" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Daily Tiers
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Seasonal
          </TabsTrigger>
          <TabsTrigger value="discounts" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Discounts
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </TabsTrigger>
          <TabsTrigger value="fix" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Fix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <PricingCalculator />
        </TabsContent>

        <TabsContent value="dynamic">
          <DynamicPricingCalculator />
        </TabsContent>

        <TabsContent value="base-pricing">
          <BasePriceEditor />
        </TabsContent>

        <TabsContent value="daily-tiers">
          <DailyTiersEditor />
        </TabsContent>

        <TabsContent value="seasonal">
          <SeasonalPricingEditor />
        </TabsContent>

        <TabsContent value="discounts">
          <DiscountManager />
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Administration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DatabaseSetup />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fix">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Direct Database Fix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DirectDatabaseFix />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PricingManagement;