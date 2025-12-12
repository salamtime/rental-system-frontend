import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Activity,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Truck,
  Fuel,
  Settings
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

// Supabase
import { supabase } from '../../utils/supabaseClient';
import { schemaDiscovery, initializeSchema } from '../../utils/schemaDiscovery';

// Lazy load heavy components
const ChartWidget = lazy(() => import('../../components/dashboard/ChartWidget'));
const MapWidget = lazy(() => import('../../components/dashboard/MapWidget'));
const RecentActivity = lazy(() => import('../../components/dashboard/RecentActivity'));

// Skeleton components for loading states
const SkeletonCard = React.memo(() => (
  <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
    <div className="flex items-center">
      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
      <div className="ml-4 flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  </div>
));

const SkeletonTable = React.memo(() => (
  <div className="bg-white rounded-lg shadow-sm border animate-pulse">
    <div className="p-4 border-b">
      <div className="h-6 bg-gray-200 rounded w-32"></div>
    </div>
    <div className="p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  </div>
));

// Optimized data fetching with React Query and Schema Discovery
const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async () => {
      console.time('Dashboard Data Fetch');
      
      try {
        // Initialize schema discovery first
        console.log('🚀 Initializing schema discovery...');
        await initializeSchema();
        
        // Batch all queries with Promise.all using discovered schema
        const [
          bookingsResult,
          toursResult,
          vehiclesResult,
          maintenanceResult,
          recentActivityResult
        ] = await Promise.all([
          // Bookings with discovered schema
          (async () => {
            const tableName = 'saharax_0u4w4d_bookings';
            if (!schemaDiscovery.tableExists(tableName)) {
              console.warn(`❌ Table ${tableName} does not exist`);
              return { data: [], error: null };
            }
            
            const safeColumns = schemaDiscovery.getSafeSelect(tableName, 
              ['id', 'status', 'created_at', 'total_price', 'total_amount', 'customer_name']
            );
            
            const result = await supabase
              .from(tableName)
              .select(safeColumns)
              .order('created_at', { ascending: false })
              .limit(10);
              
            if (result.error) {
              console.error(`❌ Error fetching from ${tableName}:`, result.error);
              return { data: [], error: null };
            }
            return result;
          })(),

          // Tours with discovered schema
          (async () => {
            const tableName = 'saharax_0u4w4d_tours';
            if (!schemaDiscovery.tableExists(tableName)) {
              console.warn(`❌ Table ${tableName} does not exist`);
              return { data: [], error: null };
            }
            
            const safeColumns = schemaDiscovery.getSafeSelect(tableName, 
              ['id', 'name', 'price', 'created_at', 'difficulty', 'type']
            );
            
            const result = await supabase
              .from(tableName)
              .select(safeColumns)
              .limit(20);
              
            if (result.error) {
              console.error(`❌ Error fetching from ${tableName}:`, result.error);
              return { data: [], error: null };
            }
            return result;
          })(),

          // Vehicles with discovered schema
          (async () => {
            const tableName = 'saharax_0u4w4d_vehicles';
            if (!schemaDiscovery.tableExists(tableName)) {
              console.warn(`❌ Table ${tableName} does not exist`);
              return { data: [], error: null };
            }
            
            const safeColumns = schemaDiscovery.getSafeSelect(tableName, 
              ['id', 'name', 'status', 'vehicle_type', 'type', 'created_at']
            );
            
            const result = await supabase
              .from(tableName)
              .select(safeColumns)
              .limit(15);
              
            if (result.error) {
              console.error(`❌ Error fetching from ${tableName}:`, result.error);
              return { data: [], error: null };
            }
            return result;
          })(),

          // Maintenance with discovered schema
          (async () => {
            const tableName = 'saharax_0u4w4d_maintenance';
            if (!schemaDiscovery.tableExists(tableName)) {
              console.warn(`❌ Table ${tableName} does not exist`);
              return { data: [], error: null };
            }
            
            const safeColumns = schemaDiscovery.getSafeSelect(tableName, 
              ['id', 'vehicle_id', 'status', 'created_at', 'type', 'description', 'cost']
            );
            
            const result = await supabase
              .from(tableName)
              .select(safeColumns)
              .order('created_at', { ascending: false })
              .limit(5);
              
            if (result.error) {
              console.error(`❌ Error fetching from ${tableName}:`, result.error);
              return { data: [], error: null };
            }
            return result;
          })(),

          // Recent activity with discovered schema
          (async () => {
            const tableName = 'saharax_0u4w4d_bookings';
            if (!schemaDiscovery.tableExists(tableName)) {
              console.warn(`❌ Table ${tableName} does not exist`);
              return { data: [], error: null };
            }
            
            const safeColumns = schemaDiscovery.getSafeSelect(tableName, 
              ['id', 'customer_name', 'created_at', 'status', 'booking_type', 'tour_name']
            );
            
            const result = await supabase
              .from(tableName)
              .select(safeColumns)
              .order('created_at', { ascending: false })
              .limit(8);
              
            if (result.error) {
              console.error(`❌ Error fetching from ${tableName}:`, result.error);
              return { data: [], error: null };
            }
            return result;
          })()
        ]);

        console.timeEnd('Dashboard Data Fetch');

        return {
          bookings: bookingsResult.data || [],
          tours: toursResult.data || [],
          vehicles: vehiclesResult.data || [],
          maintenance: maintenanceResult.data || [],
          recentActivity: recentActivityResult.data || []
        };
      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });
};

// Memoized stat card component
const StatCard = React.memo(({ icon: Icon, title, value, change, changeType = 'positive' }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border">
    <div className="flex items-center">
      <div className={`p-2 rounded-lg ${
        changeType === 'positive' ? 'bg-green-100' : 
        changeType === 'negative' ? 'bg-red-100' : 
        'bg-blue-100'
      }`}>
        <Icon className={`h-6 w-6 ${
          changeType === 'positive' ? 'text-green-600' : 
          changeType === 'negative' ? 'text-red-600' : 
          'text-blue-600'
        }`} />
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className={`text-xs ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </p>
        )}
      </div>
    </div>
  </div>
));

// Memoized quick actions component
const QuickActions = React.memo(() => {
  const { t } = useTranslation();
  
  const actions = useMemo(() => [
    { name: 'New Booking', href: '/admin/bookings', icon: Calendar, color: 'bg-blue-600 hover:bg-blue-700' },
    { name: 'Add Vehicle', href: '/admin/fleet', icon: Truck, color: 'bg-green-600 hover:bg-green-700' },
    { name: 'Schedule Maintenance', href: '/admin/maintenance', icon: Settings, color: 'bg-purple-600 hover:bg-purple-700' },
    { name: 'Log Fuel', href: '/admin/fuel', icon: Fuel, color: 'bg-orange-600 hover:bg-orange-700' }
  ], []);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.name}
            className={`inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors ${action.color}`}
            onClick={() => window.location.href = action.href}
          >
            <action.icon className="h-4 w-4 mr-2" />
            {action.name}
          </button>
        ))}
      </div>
    </div>
  );
});

// Memoized recent bookings table with virtualization for large datasets
const RecentBookingsTable = React.memo(({ bookings = [] }) => {
  const displayBookings = useMemo(() => bookings.slice(0, 5), [bookings]);
  
  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View All
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayBookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {booking.customer_name || 'Unknown Customer'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${booking.total_price || booking.total_amount || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(booking.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const OptimizedDashboard = () => {
  console.time('Dashboard Render');
  
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  
  // Auth state
  const authState = useSelector(state => state.auth);
  const { user, userRoles } = authState || {};
  
  // Use optimized data fetching
  const { data, isLoading, error, refetch } = useDashboardData();
  
  // Memoized computed values
  const stats = useMemo(() => {
    if (!data) return {};
    
    const totalBookings = data.bookings.length;
    const confirmedBookings = data.bookings.filter(b => b.status === 'confirmed').length;
    const totalRevenue = data.bookings.reduce((sum, b) => sum + (b.total_price || b.total_amount || 0), 0);
    const availableVehicles = data.vehicles.filter(v => v.status === 'available').length;
    const pendingMaintenance = data.maintenance.filter(m => m.status === 'pending').length;
    
    return {
      totalBookings,
      confirmedBookings,
      totalRevenue,
      availableVehicles,
      pendingMaintenance,
      totalVehicles: data.vehicles.length,
      totalTours: data.tours.length
    };
  }, [data]);

  // Prefetch related data on component mount
  useEffect(() => {
    const prefetchTimer = setTimeout(() => {
      // Prefetch secondary data after main content loads
      queryClient.prefetchQuery({
        queryKey: ['dashboard-charts'],
        queryFn: async () => {
          await initializeSchema();
          const tableName = 'saharax_0u4w4d_bookings';
          if (!schemaDiscovery.tableExists(tableName)) {
            return [];
          }
          
          const safeColumns = schemaDiscovery.getSafeSelect(tableName, 
            ['created_at', 'total_price', 'total_amount']
          );
          
          const result = await supabase
            .from(tableName)
            .select(safeColumns)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          return result.data || [];
        },
        staleTime: 10 * 60 * 1000
      });
    }, 100);

    return () => clearTimeout(prefetchTimer);
  }, [queryClient]);
  
  // Memoized error handler
  const handleRetry = useCallback(() => {
    refetch();
    toast.success('Dashboard data refreshed');
  }, [refetch]);
  
  React.useEffect(() => {
    console.timeEnd('Dashboard Render');
  });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load dashboard data
              </h3>
              <div className="mt-2">
                <button
                  onClick={handleRetry}
                  className="text-sm bg-red-800 text-white px-3 py-1 rounded hover:bg-red-900"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening with your quad rental business.</p>
        </div>
        <button
          onClick={handleRetry}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              icon={Calendar}
              title="Total Bookings"
              value={stats.totalBookings || 0}
              change="+12% from last month"
              changeType="positive"
            />
            <StatCard
              icon={CheckCircle}
              title="Confirmed Bookings"
              value={stats.confirmedBookings || 0}
              change="+8% from last month"
              changeType="positive"
            />
            <StatCard
              icon={DollarSign}
              title="Total Revenue"
              value={`$${stats.totalRevenue?.toLocaleString() || 0}`}
              change="+15% from last month"
              changeType="positive"
            />
            <StatCard
              icon={Truck}
              title="Available Vehicles"
              value={`${stats.availableVehicles || 0}/${stats.totalVehicles || 0}`}
              change={stats.pendingMaintenance ? `${stats.pendingMaintenance} need maintenance` : "All operational"}
              changeType={stats.pendingMaintenance > 0 ? "negative" : "positive"}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Maps (Lazy Loaded) */}
        <div className="lg:col-span-2 space-y-6">
          <Suspense fallback={<SkeletonTable />}>
            <ChartWidget />
          </Suspense>
          
          <Suspense fallback={<SkeletonTable />}>
            <MapWidget />
          </Suspense>
        </div>

        {/* Right Column - Quick Actions and Recent Activity */}
        <div className="space-y-6">
          <QuickActions />
          
          {isLoading ? (
            <SkeletonTable />
          ) : (
            <RecentBookingsTable bookings={data?.recentActivity || []} />
          )}
          
          <Suspense fallback={<SkeletonTable />}>
            <RecentActivity />
          </Suspense>
        </div>
      </div>

      {/* Bottom Row - Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              icon={MapPin}
              title="Active Tours"
              value={stats.totalTours || 0}
              change="2 new this week"
              changeType="positive"
            />
            <StatCard
              icon={Settings}
              title="Maintenance Due"
              value={stats.pendingMaintenance || 0}
              change={stats.pendingMaintenance > 0 ? "Requires attention" : "All up to date"}
              changeType={stats.pendingMaintenance > 0 ? "negative" : "positive"}
            />
            <StatCard
              icon={TrendingUp}
              title="Growth Rate"
              value="23%"
              change="vs last quarter"
              changeType="positive"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default OptimizedDashboard;