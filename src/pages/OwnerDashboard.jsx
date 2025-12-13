import React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  Users, 
  BarChart3, 
  Shield, 
  Database,
  Calendar,
  MapPin,
  DollarSign,
  AlertTriangle,
  Activity,
  Fuel,
  Wrench
} from 'lucide-react';

const OwnerDashboard = () => {
  const { user } = useSelector(state => state.auth);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                👑 Owner Dashboard
              </h1>
              <p className="text-lg text-gray-600 mt-1">
                Welcome back, {user?.user_metadata?.full_name || 'Owner'}! Full system control.
              </p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
              🟢 OWNER ACCESS
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <DollarSign className="h-10 w-10 text-green-500 mr-4" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">$24,580</h3>
                <p className="text-gray-600">Monthly Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <Users className="h-10 w-10 text-blue-500 mr-4" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">156</h3>
                <p className="text-gray-600">Total Users</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <Activity className="h-10 w-10 text-purple-500 mr-4" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">89%</h3>
                <p className="text-gray-600">System Uptime</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center">
              <AlertTriangle className="h-10 w-10 text-orange-500 mr-4" />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">3</h3>
                <p className="text-gray-600">Active Alerts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* System Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Settings className="h-8 w-8 mr-3 text-gray-700" />
              System Management
            </h2>
            <div className="space-y-3">
              <Link
                to="/admin/settings"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Database className="h-5 w-5 mr-3 text-gray-600" />
                  <span className="font-medium">System Preferences</span>
                </div>
              </Link>
              <Link
                to="/admin/users"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3 text-blue-600" />
                  <span className="font-medium">User Management</span>
                </div>
              </Link>
              <Link
                to="/admin/alerts"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-3 text-orange-600" />
                  <span className="font-medium">System Alerts</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Operations Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Activity className="h-8 w-8 mr-3 text-blue-600" />
              Operations
            </h2>
            <div className="space-y-3">
              <Link
                to="/admin/calendar"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-green-600" />
                  <span className="font-medium">Tour Calendar</span>
                </div>
              </Link>
              <Link
                to="/fleet"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-3 text-purple-600" />
                  <span className="font-medium">Fleet Management</span>
                </div>
              </Link>
              <Link
                to="/admin/maintenance"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Wrench className="h-5 w-5 mr-3 text-red-600" />
                  <span className="font-medium">Maintenance</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Financial Management */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-8 w-8 mr-3 text-green-600" />
              Finance & Analytics
            </h2>
            <div className="space-y-3">
              <Link
                to="/admin/finance"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-3 text-green-600" />
                  <span className="font-medium">Financial Reports</span>
                </div>
              </Link>
              <Link
                to="/admin/analytics"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-3 text-blue-600" />
                  <span className="font-medium">Business Analytics</span>
                </div>
              </Link>
              <Link
                to="/admin/fuel"
                className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <Fuel className="h-5 w-5 mr-3 text-orange-600" />
                  <span className="font-medium">Fuel Records</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Owner Privileges Notice */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h3 className="text-xl font-bold text-green-900 mb-4">
            👑 Owner Privileges
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-800">
            <div>
              <h4 className="font-semibold mb-2">System Control:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Full system preferences access</li>
                <li>• Complete user management control</li>
                <li>• Financial data and analytics</li>
                <li>• System alerts and maintenance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Business Management:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Approve/cancel any booking</li>
                <li>• Complete financial oversight</li>
                <li>• User role management (all roles)</li>
                <li>• System configuration control</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;