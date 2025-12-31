import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertCircle, Car, Users, Wrench, DollarSign, TrendingUp, TrendingDown, Clock, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Helper to format numbers (e.g., 1000 -> 1k)
const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num;
};

// Overview Statistics Component
const OverviewStats = ({ stats, loading }) => {
  const statItems = [
    { icon: <Car className="w-6 h-6 text-blue-500" />, label: 'Total Vehicles', value: stats.vehicles, color: 'blue', link: '/admin/fleet' },
    { icon: <Users className="w-6 h-6 text-green-500" />, label: 'Active Rentals', value: stats.rentals, color: 'green', link: '/admin/rentals' },
    { icon: <Wrench className="w-6 h-6 text-yellow-500" />, label: 'Maintenance', value: stats.maintenance, color: 'yellow', link: '/admin/maintenance' },
    { icon: <DollarSign className="w-6 h-6 text-purple-500" />, label: 'Total Revenue', value: `$${formatNumber(stats.revenue)}`, color: 'purple', link: '/admin/finance' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-md animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-12 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map(item => (
        <Link to={item.link} key={item.label} className="block hover:shadow-lg transition-shadow duration-300">
          <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 border-${item.color}-500 h-full`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{item.label}</p>
                <p className="text-3xl font-bold text-gray-800">{item.value}</p>
              </div>
              <div className={`p-3 bg-${item.color}-100 rounded-full`}>
                {item.icon}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

// Revenue Trend Chart
const RevenueChart = ({ data, loading }) => {
  if (loading) return <div className="bg-white p-6 rounded-lg shadow-md h-80 animate-pulse"></div>;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Revenue Trend (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Vehicle Utilization Chart
const VehicleUtilizationChart = ({ data, loading }) => {
  if (loading) return <div className="bg-white p-6 rounded-lg shadow-md h-80 animate-pulse"></div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Vehicle Utilization</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="rentals" fill="#82ca9d" name="Number of Rentals" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Recent Bookings Table
const RecentBookings = ({ bookings, loading }) => {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-gray-200 rounded"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Recent Bookings</h3>
        <Link to="/admin/rentals" className="text-sm font-medium text-blue-600 hover:underline">
          View All
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map(booking => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.customer_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.vehicle?.vehicle_type || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.total_amount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${booking.payment_status === 'paid' ? 'green' : 'yellow'}-100 text-${booking.payment_status === 'paid' ? 'green' : 'yellow'}-800`}>
                    {booking.payment_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ vehicles: 0, rentals: 0, maintenance: 0, revenue: 0 });
  const [revenueData, setRevenueData] = useState([]);
  const [utilizationData, setUtilizationData] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      // --- Fetch overview stats ---
      const { count: vehiclesCount, error: vError } = await supabase.from('saharax_0u4w4d_vehicles').select('*', { count: 'exact', head: true });
      const { count: rentalsCount, error: rError } = await supabase.from('app_4c3a7a6153_rentals').select('*', { count: 'exact', head: true }).eq('rental_status', 'active');
      
      const { data: openMaintenance, error: mError } = await supabase
        .from('app_687f658e98_maintenance')
        .select('vehicle_id')
        .in('status', ['scheduled', 'in_progress']);

      const { data: revenueData, error: revError } = await supabase.from('app_4c3a7a6153_rentals').select('total_amount').eq('payment_status', 'paid');

      if (vError || rError || mError || revError) {
        const error = vError || rError || mError || revError;
        console.error('❌ Error fetching overview stats', { message: error.message, details: error.details, hint: error.hint, code: error.code });
      }

      const maintenanceCount = openMaintenance ? new Set(openMaintenance.map(r => r.vehicle_id)).size : 0;
      const totalRevenue = revenueData ? revenueData.reduce((acc, item) => acc + item.total_amount, 0) : 0;
      
      setStats({
        vehicles: vehiclesCount || 0,
        rentals: rentalsCount || 0,
        maintenance: maintenanceCount || 0,
        revenue: totalRevenue,
      });

      // --- Fetch recent bookings with vehicle type ---
      const { data: bookings, error: bError } = await supabase
        .from("app_4c3a7a6153_rentals")
        .select("*, vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (bError) console.error('❌ Error fetching recent bookings', { message: bError.message, details: bError.details, hint: bError.hint, code: bError.code });
      setRecentBookings(bookings || []);

      // --- Fetch and process data for Revenue Trend Chart ---
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: revenueTrendRaw, error: revenueTrendError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('created_at, total_amount')
        .eq('payment_status', 'paid')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (revenueTrendError) console.error('❌ Error fetching revenue trend', { message: revenueTrendError.message, details: revenueTrendError.details, hint: revenueTrendError.hint, code: revenueTrendError.code });

      const dailyRevenue = {};
      if (revenueTrendRaw) {
        revenueTrendRaw.forEach(rental => {
          const date = new Date(rental.created_at).toISOString().split('T')[0];
          if (!dailyRevenue[date]) dailyRevenue[date] = 0;
          dailyRevenue[date] += rental.total_amount;
        });
      }

      const last7DaysData = Array(7).fill(0).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dailyRevenue[dateStr] || 0,
        };
      }).reverse();
      setRevenueData(last7DaysData);

      // --- Fetch and process data for Vehicle Utilization Chart ---
      const { data: allRentals, error: allRentalsError } = await supabase.from('app_4c3a7a6153_rentals').select('vehicle_id');
      const { data: allVehicles, error: allVehiclesError } = await supabase.from("saharax_0u4w4d_vehicles").select("id, vehicle_type");

      if (allRentalsError || allVehiclesError) {
          const error = allRentalsError || allVehiclesError;
          console.error('❌ Error fetching utilization data', { message: error.message, details: error.details, hint: error.hint, code: error.code });
      }

      const utilization = {};
      if (allRentals && allVehicles) {
        const vehicleTypeMap = new Map(allVehicles.map(v => [v.id, v.vehicle_type]));
        allRentals.forEach(rental => {
          const vehicleType = vehicleTypeMap.get(rental.vehicle_id);
          if (vehicleType) {
            if (!utilization[vehicleType]) utilization[vehicleType] = 0;
            utilization[vehicleType]++;
          }
        });
      }
      const utilizationChartData = Object.keys(utilization).map(type => ({ name: type, rentals: utilization[type] }));
      setUtilizationData(utilizationChartData);

    } catch (error) {
      console.error('❌ Error in fetchData', { message: error.message, details: error.details, hint: error.hint, code: error.code });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRental = () => {
    console.log('🔵 Navigating to /admin/rentals with openForm state');
    navigate('/admin/rentals', { state: { openForm: true } });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header with Create Rental Button */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.email}</p>
        </div>
        
        {/* Desktop Button */}
        <button
          onClick={handleCreateRental}
          className="hidden sm:flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Rental</span>
        </button>
      </div>

      {/* Mobile Floating Action Button */}
      <button
        onClick={handleCreateRental}
        className="sm:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg hover:shadow-xl font-medium"
        aria-label="Create New Rental"
      >
        <Plus className="w-6 h-6" />
        <span className="text-sm font-semibold">Create New Rental</span>
      </button>
      
      <OverviewStats stats={stats} loading={loading} />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RevenueChart data={revenueData} loading={loading} />
        <VehicleUtilizationChart data={utilizationData} loading={loading} />
      </div>

      <div className="mt-8">
        <RecentBookings bookings={recentBookings} loading={loading} />
      </div>
    </div>
  );
};

export default AdminDashboard;