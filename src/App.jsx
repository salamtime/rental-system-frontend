import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute, { AdminRoute, EmployeeRoute, GuideRoute, CustomerRoute } from './components/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Import existing pages
import Rentals from './pages/admin/Rentals';
import RentalDetails from './pages/admin/RentalDetails';
import Vehicles from './pages/admin/Vehicles';
import InvoicePage from './pages/admin/InvoicePage'; // Import the new invoice page

// Import role-specific dashboards
import AdminDashboard from './pages/admin/Dashboard';
import GuideDashboard from './pages/guide/Dashboard';
import CustomerDashboard from './pages/customer/Dashboard';

// Import auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';

// Import profile management
import ProfilePage from './components/profile/ProfilePage';

// Import module pages
import CalendarPage from './pages/admin/Calendar';
import ToursPage from './pages/admin/Tours';
import FleetPage from './pages/admin/Fleet';
import PricingPage from './pages/admin/Pricing';
import MaintenancePage from './pages/admin/Maintenance';
import FuelPage from './pages/admin/Fuel';
import InventoryPage from './pages/admin/Inventory';
import FinancePage from './pages/admin/Finance';
import AlertsPage from './pages/admin/Alerts';
import UserManagement from './pages/admin/UserManagement';
import SettingsPage from './pages/admin/Settings';
import ExportPage from './pages/admin/Export';

// Import Customer Management Dashboard
import CustomerManagementDashboard from './components/CustomerManagementDashboard';

// Import camera test page
import CameraTest from './pages/CameraTest';
import TestCustomerDetails from './pages/TestCustomerDetails';

/**
 * HomeRedirect - Redirects users based on their authentication status and role
 */
const HomeRedirect = () => {
  const { user, userProfile, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading Application...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔄 HomeRedirect: No user found, redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = userProfile?.role;
  const dashboardPaths = {
    owner: '/admin/dashboard',
    admin: '/admin/dashboard',
    employee: '/admin/dashboard', // Redirect employees to the admin dashboard
    guide: '/guide/dashboard',
    customer: '/customer/dashboard',
  };

  const redirectTo = dashboardPaths[role] || '/login';
  console.log(`🔄 HomeRedirect: User with role '${role}' found, redirecting to ${redirectTo}`);
  return <Navigate to={redirectTo} replace />;
};

function App() {
  console.log('🚀 App: Component rendering started');

  return (
    <ErrorBoundary name="App-Root">
      <Router>
        <AuthProvider>
          <ErrorBoundary name="Router-Wrapper">
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Test Route */}
                <Route path="/test-customer-details" element={<TestCustomerDetails />} />

                {/* Camera Test Route - Public for debugging */}
                <Route path="/camera-test" element={<CameraTest />} />

                {/* Invoice Route - Should be accessible to authorized users */}
                <Route path="/invoice/:id" element={
                  <ErrorBoundary name="Invoice-Page">
                    <ProtectedRoute>
                      <InvoicePage />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />

                {/* Profile Route - Available to all authenticated users */}
                <Route path="/profile" element={
                  <ErrorBoundary name="Profile-Page">
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  </ErrorBoundary>
                } />

                {/* Protected Admin Routes with Layout */}
                <Route path="/admin/*" element={
                  <ErrorBoundary name="Admin-Routes">
                    <EmployeeRoute>
                      <AdminLayout />
                    </EmployeeRoute>
                  </ErrorBoundary>
                }>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<ErrorBoundary name="Admin-Dashboard"><AdminDashboard /></ErrorBoundary>} />
                  <Route path="calendar" element={<ErrorBoundary name="Calendar-Page"><CalendarPage /></ErrorBoundary>} />
                  <Route path="tours/*" element={<ErrorBoundary name="Tours-Page"><ToursPage /></ErrorBoundary>} />
                  <Route path="rentals" element={<ErrorBoundary name="Rentals-Page"><Rentals /></ErrorBoundary>} />
                  <Route path="rentals/:id" element={<ErrorBoundary name="Rental-Details"><RentalDetails /></ErrorBoundary>} />
                  <Route path="customers" element={<ErrorBoundary name="Customer-Management-Dashboard"><CustomerManagementDashboard /></ErrorBoundary>} />
                  <Route path="fleet/*" element={<ErrorBoundary name="Fleet-Page"><FleetPage /></ErrorBoundary>} />
                  <Route path="pricing/*" element={<ErrorBoundary name="Pricing-Page"><PricingPage /></ErrorBoundary>} />
                  <Route path="maintenance/*" element={<ErrorBoundary name="Maintenance-Page"><MaintenancePage /></ErrorBoundary>} />
                  <Route path="fuel/*" element={<ErrorBoundary name="Fuel-Page"><FuelPage /></ErrorBoundary>} />
                  <Route path="inventory/*" element={<ErrorBoundary name="Inventory-Page"><InventoryPage /></ErrorBoundary>} />
                  <Route path="finance/*" element={<ErrorBoundary name="Finance-Page"><FinancePage /></ErrorBoundary>} />
                  <Route path="alerts/*" element={<ErrorBoundary name="Alerts-Page"><AlertsPage /></ErrorBoundary>} />
                  <Route path="users/*" element={<ErrorBoundary name="User-Management-Page"><UserManagement /></ErrorBoundary>} />
                  <Route path="settings/*" element={<ErrorBoundary name="Settings-Page"><SettingsPage /></ErrorBoundary>} />
                  <Route path="export/*" element={<ErrorBoundary name="Export-Page"><ExportPage /></ErrorBoundary>} />
                  <Route path="vehicles/*" element={<ErrorBoundary name="Vehicles-Page"><Vehicles /></ErrorBoundary>} />
                  <Route path="profile" element={<ErrorBoundary name="Admin-Profile"><ProfilePage /></ErrorBoundary>} />
                </Route>

                {/* Guide Routes */}
                <Route path="/guide/*" element={
                  <ErrorBoundary name="Guide-Routes">
                    <GuideRoute>
                      <Routes>
                        <Route path="dashboard" element={<GuideDashboard />} />
                        <Route path="tours" element={<ToursPage />} />
                        <Route path="vehicles" element={<Vehicles />} />
                        <Route path="profile" element={<ProfilePage />} />
                      </Routes>
                    </GuideRoute>
                  </ErrorBoundary>
                } />

                {/* Customer Routes */}
                <Route path="/customer/*" element={
                  <ErrorBoundary name="Customer-Routes">
                    <CustomerRoute>
                      <Routes>
                        <Route path="dashboard" element={<CustomerDashboard />} />
                        <Route path="book" element={<div className="p-6"><div className="bg-purple-50 border border-purple-200 rounded-lg p-6"><h2 className="text-lg font-semibold text-purple-900 mb-2">Booking System</h2><p className="text-purple-800">Vehicle booking interface will be implemented here.</p></div></div>} />
                        <Route path="rentals" element={<div className="p-6"><div className="bg-purple-50 border border-purple-200 rounded-lg p-6"><h2 className="text-lg font-semibold text-purple-900 mb-2">My Rentals</h2><p className="text-purple-800">Personal rental history will be implemented here.</p></div></div>} />
                        <Route path="profile" element={<ProfilePage />} />
                      </Routes>
                    </CustomerRoute>
                  </ErrorBoundary>
                } />

                {/* Root path now uses the intelligent redirect */}
                <Route path="/" element={<HomeRedirect />} />

                {/* Catch-all redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </ErrorBoundary>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

console.log('📦 App: Module loaded successfully');
export default App;