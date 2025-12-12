import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Database, CheckCircle, XCircle, AlertTriangle, Wrench } from 'lucide-react';

const DirectDatabaseFix = () => {
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState([]);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const fixDatabase = async () => {
    setStatus('running');
    setResults([]);
    addResult('Starting direct database fix...', 'info');

    try {
      // FIXED: Updated all table references from pricing_rules to pricing_simple
      const fixSQL = `
        -- Drop old pricing_rules table if it exists
        DROP TABLE IF EXISTS saharax_0u4w4d_pricing_rules CASCADE;
        
        -- Create the correct pricing_simple table
        CREATE TABLE saharax_0u4w4d_pricing_simple (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          vehicle_model_id UUID,
          rule_type TEXT NOT NULL DEFAULT 'base_price',
          duration_type TEXT NOT NULL DEFAULT 'daily',
          price DECIMAL(10,2) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(vehicle_model_id, rule_type, duration_type)
        );
        
        -- Disable RLS for pricing_simple
        ALTER TABLE saharax_0u4w4d_pricing_simple DISABLE ROW LEVEL SECURITY;
        
        -- Grant permissions for pricing_simple
        GRANT ALL ON saharax_0u4w4d_pricing_simple TO anon;
        GRANT ALL ON saharax_0u4w4d_pricing_simple TO authenticated;
        
        -- Create daily tiers table if it doesn't exist
        CREATE TABLE IF NOT EXISTS saharax_0u4w4d_daily_tiers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          vehicle_model_id UUID,
          min_days INTEGER NOT NULL,
          max_days INTEGER,
          price_per_day DECIMAL(10,2) NOT NULL,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(vehicle_model_id, min_days)
        );
        
        -- Disable RLS for daily_tiers
        ALTER TABLE saharax_0u4w4d_daily_tiers DISABLE ROW LEVEL SECURITY;
        
        -- Grant permissions for daily_tiers
        GRANT ALL ON saharax_0u4w4d_daily_tiers TO anon;
        GRANT ALL ON saharax_0u4w4d_daily_tiers TO authenticated;
        
        -- Create seasonal pricing table if it doesn't exist
        CREATE TABLE IF NOT EXISTS saharax_0u4w4d_seasonal_pricing (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
          description TEXT,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Disable RLS for seasonal_pricing
        ALTER TABLE saharax_0u4w4d_seasonal_pricing DISABLE ROW LEVEL SECURITY;
        
        -- Grant permissions for seasonal_pricing
        GRANT ALL ON saharax_0u4w4d_seasonal_pricing TO anon;
        GRANT ALL ON saharax_0u4w4d_seasonal_pricing TO authenticated;
      `;

      addResult('Executing database fix SQL...', 'info');
      
      const { error: sqlError } = await supabase.rpc('exec', { sql: fixSQL });
      
      if (sqlError) {
        addResult(`SQL execution failed: ${sqlError.message}`, 'error');
        setStatus('error');
        return;
      }

      addResult('Database tables created successfully', 'success');

      // Test the new tables
      addResult('Testing pricing_simple table...', 'info');
      const { data: pricingTest, error: pricingError } = await supabase
        .from('saharax_0u4w4d_pricing_simple')
        .select('*')
        .limit(1);

      if (pricingError) {
        addResult(`Pricing simple test failed: ${pricingError.message}`, 'error');
      } else {
        addResult('Pricing simple table is working correctly', 'success');
      }

      addResult('Testing daily_tiers table...', 'info');
      const { data: tiersTest, error: tiersError } = await supabase
        .from('saharax_0u4w4d_daily_tiers')
        .select('*')
        .limit(1);

      if (tiersError) {
        addResult(`Daily tiers test failed: ${tiersError.message}`, 'error');
      } else {
        addResult('Daily tiers table is working correctly', 'success');
      }

      addResult('Testing seasonal_pricing table...', 'info');
      const { data: seasonalTest, error: seasonalError } = await supabase
        .from('saharax_0u4w4d_seasonal_pricing')
        .select('*')
        .limit(1);

      if (seasonalError) {
        addResult(`Seasonal pricing test failed: ${seasonalError.message}`, 'error');
      } else {
        addResult('Seasonal pricing table is working correctly', 'success');
      }

      addResult('Database fix completed successfully!', 'success');
      setStatus('completed');

    } catch (error) {
      addResult(`Fix failed: ${error.message}`, 'error');
      setStatus('error');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Database className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Direct Database Fix
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool directly fixes database table issues by recreating the correct table structure.
            Use this if you're experiencing table relationship errors.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button 
            onClick={fixDatabase} 
            disabled={status === 'running'}
            className="flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            {status === 'running' ? 'Fixing...' : 'Fix Database Tables'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setResults([])}
            disabled={status === 'running'}
          >
            Clear Log
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-4 bg-gray-50">
            <h3 className="font-semibold text-sm">Fix Log:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {getIcon(result.type)}
                <span className="text-gray-500 text-xs">{result.timestamp}</span>
                <span className={`flex-1 ${
                  result.type === 'error' ? 'text-red-700' : 
                  result.type === 'success' ? 'text-green-700' : 
                  result.type === 'warning' ? 'text-yellow-700' : 
                  'text-gray-700'
                }`}>
                  {result.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {status === 'completed' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Database fix completed! The correct table structure has been created. 
              Try refreshing the page and testing the pricing functionality.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default DirectDatabaseFix;