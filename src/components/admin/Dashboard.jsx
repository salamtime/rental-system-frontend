import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Clock,
  Fuel,
  Plus,
  Minus,
  Droplets,
  FileText,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';
import fuelService from '../../services/FuelService';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    rentedVehicles: 0,
    activeRentals: 0,
    todaysBookings: 0,
    totalRevenue: 0,
  });
  
  const [recentBookings, setRecentBookings] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [vehicleUtilization, setVehicleUtilization] = useState([]);
  const [fuelData, setFuelData] = useState({
    tank: null,
    refills: [],
    withdrawals: []
  });
  
  const [loading, setLoading] = useState(true);
  const [fuelLoading, setFuelLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadFuelData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Vehicle statistics
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('app_8e5dfd7c0e_vehicles')
        .select('status');
      if (vehiclesError) throw vehiclesError;
      const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
      const vehicleStats = safeVehicles.reduce((acc, vehicle) => {
        acc.totalVehicles++;
        if (vehicle.status === 'available') acc.availableVehicles++;
        if (vehicle.status === 'maintenance') acc.maintenanceVehicles++;
        if (vehicle.status === 'rented') acc.rentedVehicles++;
        return acc;
      }, { totalVehicles: 0, availableVehicles: 0, maintenanceVehicles: 0, rentedVehicles: 0 });

      // Active rentals
      const { count: activeRentals, error: activeRentalsError } = await supabase
        .from('app_8e5dfd7c0e_rentals')
        .select('*', { count: 'exact' })
        .eq('rental_status', 'active');
      if (activeRentalsError) throw activeRentalsError;

      // Today's bookings
      const today = new Date().toISOString().slice(0, 10);
      const { count: todaysBookings, error: todaysBookingsError } = await supabase
        .from('app_8e5dfd7c0e_rentals')
        .select('*', { count: 'exact' })
        .gte('created_at', `${today}T00:00:00.000Z`);
      if (todaysBookingsError) throw todaysBookingsError;

      // Total revenue
      const { data: paidRentals, error: rentalsError } = await supabase
        .from('app_8e5dfd7c0e_rentals')
        .select('total_amount')
        .eq('payment_status', 'paid');
      if (rentalsError) throw rentalsError;
      const totalRevenue = paidRentals.reduce((sum, rental) => sum + (rental.total_amount || 0), 0);

      // Recent bookings
      const { data: recent, error: recentError } = await supabase
        .from('app_8e5dfd7c0e_rentals')
        .select('*, vehicle:app_8e5dfd7c0e_vehicles(name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentError) throw recentError;
      setRecentBookings(recent || []);

      // Revenue Trend (last 7 days)
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toISOString().slice(0, 10);
          const { data: dailyRentals, error: dailyError } = await supabase
              .from('app_8e5dfd7c0e_rentals')
              .select('total_amount')
              .eq('payment_status', 'paid')
              .gte('created_at', `${dateString}T00:00:00.000Z`)
              .lte('created_at', `${dateString}T23:59:59.999Z`);
          if (dailyError) throw dailyError;
          const dailyRevenue = dailyRentals.reduce((sum, r) => sum + r.total_amount, 0);
          trendData.push({ date: date.toLocaleDateString('en-US', { weekday: 'short' }), revenue: dailyRevenue });
      }
      setRevenueTrend(trendData);

      // Vehicle Utilization
      setVehicleUtilization([
        { name: 'Available', value: vehicleStats.availableVehicles, color: '#22c55e' },
        { name: 'Rented', value: vehicleStats.rentedVehicles, color: '#3b82f6' },
        { name: 'Maintenance', value: vehicleStats.maintenanceVehicles, color: '#f59e0b' },
      ]);

      setStats({
        ...vehicleStats,
        activeRentals: activeRentals || 0,
        todaysBookings: todaysBookings || 0,
        totalRevenue,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFuelData = async () => {
    try {
      const unsubscribe = fuelService.subscribe((data) => {
        setFuelData({
          tank: data?.tank || null,
          refills: Array.isArray(data?.refills) ? data.refills : [],
          withdrawals: Array.isArray(data?.withdrawals) ? data.withdrawals : []
        });
        setFuelLoading(false);
      });
      await fuelService.loadData();
      return unsubscribe;
    } catch (error) {
      console.error('Error loading fuel data:', error);
      setFuelLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, Admin! Here's your fleet overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {[
          { title: 'Total Vehicles', value: stats.totalVehicles, icon: Car, color: 'blue' },
          { title: 'Active Rentals', value: stats.activeRentals, icon: Users, color: 'indigo' },
          { title: 'Today\'s Bookings', value: stats.todaysBookings, icon: Calendar, color: 'purple' },
          { title: 'Total Revenue', value: stats.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'MAD' }), icon: DollarSign, color: 'green', link: '/admin/rentals?paymentStatus=paid' },
          { title: 'Maintenance Alerts', value: stats.maintenanceVehicles, icon: AlertTriangle, color: 'yellow' },
          { title: 'Available Now', value: stats.availableVehicles, icon: Car, color: 'teal' },
        ].map(item => (
          <div key={item.title} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 border-${item.color}-500`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 font-medium">{item.title}</p>
                <p className="text-2xl font-bold text-gray-800">{item.value}</p>
              </div>
              <div className={`p-2 rounded-full bg-${item.color}-100`}>
                <item.icon className={`w-6 h-6 text-${item.color}-600`} />
              </div>
            </div>
            {item.link && <Link to={item.link} className="text-sm text-blue-500 hover:underline mt-2 inline-block">View Details</Link>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6b7280' }} />
              <YAxis tick={{ fill: '#6b7280' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue (MAD)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehicle Utilization</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={vehicleUtilization} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {vehicleUtilization.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Bookings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Customer</th>
                <th scope="col" className="px-6 py-3">Vehicle</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map(booking => (
                <tr key={booking.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{booking.customer_name || 'N/A'}</td>
                  <td className="px-6 py-4">{booking.vehicle?.name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      booking.rental_status === 'active' ? 'bg-green-100 text-green-800' :
                      booking.rental_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{booking.rental_status}</span>
                  </td>
                  <td className="px-6 py-4">{new Date(booking.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;