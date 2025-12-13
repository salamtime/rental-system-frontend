import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  UserPlus, 
  Edit, 
  Trash2, 
  Settings, 
  Eye, 
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Shield,
  Users
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'customer',
    status: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [userPermissions, setUserPermissions] = useState({});

  // Available roles and modules
  const roles = [
    { value: 'owner', label: 'Owner', color: 'bg-purple-100 text-purple-800' },
    { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-800' },
    { value: 'employee', label: 'Employee', color: 'bg-green-100 text-green-800' },
    { value: 'guide', label: 'Guide', color: 'bg-orange-100 text-orange-800' },
    { value: 'customer', label: 'Customer', color: 'bg-gray-100 text-gray-800' }
  ];

  const modules = [
    'Dashboard',
    'Tours & Booking',
    'Booking Management',
    'Fleet Management',
    'Quad Maintenance',
    'Fuel Records',
    'Inventory',
    'Finance Management',
    'Alerts',
    'User & Role Management',
    'System Settings',
    'Project Export'
  ];

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Use admin API to list users
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
        return;
      }

      setUsers(data.users || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Generate secure password
  const generateSecurePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Handle generate password
  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setFormData(prev => ({ ...prev, password: newPassword }));
    toast.success('Secure password generated');
  };

  // Add new user
  const handleAddUser = async () => {
    if (!formData.email || !formData.password || !formData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if only owners can assign owner role
    if (formData.role === 'owner' && currentUser?.user_metadata?.role !== 'owner') {
      toast.error('Only owners can assign the owner role');
      return;
    }

    try {
      setActionLoading(true);
      
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          role: formData.role,
          full_name: formData.name,
          status: formData.status ? 'active' : 'inactive',
          permissions: formData.role === 'owner' ? modules : []
        }
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Store credentials for display
      setGeneratedCredentials({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role
      });

      toast.success('User created successfully');
      setIsAddModalOpen(false);
      setIsCredentialsModalOpen(true);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'customer',
        status: true
      });
      
      // Refresh users
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  // Get role badge
  const getRoleBadge = (role) => {
    const roleInfo = roles.find(r => r.value === role) || roles[4];
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleInfo.color}`}>
        {roleInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User & Role Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)} 
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4" />
          Add New User
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow-md border p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{user.user_metadata?.full_name || 'No Name'}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {user.user_metadata?.status === 'inactive' && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
                {getRoleBadge(user.user_metadata?.role)}
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">Created: {new Date(user.created_at).toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">
                Permissions: {user.user_metadata?.permissions?.length || 0} modules
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                <Edit className="h-3 w-3" />
                Edit
              </button>
              
              <button className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                <Settings className="h-3 w-3" />
                Permissions
              </button>
              
              {user.id !== currentUser?.id && (
                <button className="flex items-center gap-1 px-3 py-1 text-sm border rounded-md text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Simple Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New User</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map((role) => (
                    <option 
                      key={role.value} 
                      value={role.value}
                      disabled={role.value === 'owner' && currentUser?.user_metadata?.role !== 'owner'}
                    >
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="status"
                  checked={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="status" className="text-sm">Active User</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddUser}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />}
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Display Modal */}
      {isCredentialsModalOpen && generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-4 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <h2 className="text-xl font-semibold">User Credentials</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Save these credentials securely. The password will not be shown again.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <div className="flex items-center gap-2">
                  <input 
                    value={generatedCredentials.email} 
                    readOnly 
                    className="flex-1 px-3 py-2 bg-gray-50 border rounded-md" 
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.email);
                      toast.success('Email copied to clipboard');
                    }}
                    className="p-2 text-gray-600 hover:text-gray-800"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="flex items-center gap-2">
                  <input 
                    value={generatedCredentials.password} 
                    readOnly 
                    className="flex-1 px-3 py-2 bg-gray-50 border rounded-md font-mono" 
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.password);
                      toast.success('Password copied to clipboard');
                    }}
                    className="p-2 text-gray-600 hover:text-gray-800"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input 
                  value={generatedCredentials.name} 
                  readOnly 
                  className="w-full px-3 py-2 bg-gray-50 border rounded-md" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <input 
                  value={generatedCredentials.role} 
                  readOnly 
                  className="w-full px-3 py-2 bg-gray-50 border rounded-md" 
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  const text = `Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}\nName: ${generatedCredentials.name}\nRole: ${generatedCredentials.role}`;
                  navigator.clipboard.writeText(text);
                  toast.success('All credentials copied to clipboard');
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" />
                Copy All
              </button>
              <button 
                onClick={() => setIsCredentialsModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;