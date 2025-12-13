import React, { useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../../utils/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

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

  // Edit user
  const handleEditUser = async () => {
    if (!selectedUser || !formData.name) {
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
      
      const updates = {
        user_metadata: {
          ...selectedUser.user_metadata,
          role: formData.role,
          full_name: formData.name,
          status: formData.status ? 'active' : 'inactive'
        }
      };

      // Add password if provided
      if (formData.password) {
        updates.password = formData.password;
        
        // Store credentials for display if password was changed
        setGeneratedCredentials({
          email: selectedUser.email,
          password: formData.password,
          name: formData.name,
          role: formData.role
        });
      }

      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        selectedUser.id,
        updates
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      
      // Show credentials if password was changed
      if (formData.password) {
        setIsCredentialsModalOpen(true);
      }
      
      // Refresh users
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Prevent self-deletion
    if (selectedUser.id === currentUser?.id) {
      toast.error('You cannot delete yourself');
      return;
    }

    try {
      setActionLoading(true);
      
      const { error } = await supabaseAdmin.auth.admin.deleteUser(selectedUser.id);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('User deleted successfully');
      setIsDeleteModalOpen(false);
      
      // Refresh users
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Update user permissions
  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(true);
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        selectedUser.id,
        {
          user_metadata: {
            ...selectedUser.user_metadata,
            permissions: Object.keys(userPermissions).filter(key => userPermissions[key])
          }
        }
      );

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Permissions updated successfully');
      setIsPermissionsModalOpen(false);
      
      // Refresh users
      fetchUsers();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setActionLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.user_metadata?.full_name || '',
      role: user.user_metadata?.role || 'customer',
      status: user.user_metadata?.status !== 'inactive'
    });
    setIsEditModalOpen(true);
  };

  // Open permissions modal
  const openPermissionsModal = (user) => {
    setSelectedUser(user);
    const permissions = {};
    modules.forEach(module => {
      permissions[module] = user.user_metadata?.permissions?.includes(module) || user.user_metadata?.role === 'owner';
    });
    setUserPermissions(permissions);
    setIsPermissionsModalOpen(true);
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Copy all credentials
  const copyAllCredentials = () => {
    if (!generatedCredentials) return;
    
    const text = `Email: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}\nName: ${generatedCredentials.name}\nRole: ${generatedCredentials.role}`;
    navigator.clipboard.writeText(text);
    toast.success('All credentials copied to clipboard');
  };

  // Get role badge
  const getRoleBadge = (role) => {
    const roleInfo = roles.find(r => r.value === role) || roles[4];
    return (
      <Badge className={roleInfo.color}>
        {roleInfo.label}
      </Badge>
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
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <Card key={user.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{user.user_metadata?.full_name || 'No Name'}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-1">
                  {user.user_metadata?.status === 'inactive' && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Inactive
                    </Badge>
                  )}
                  {getRoleBadge(user.user_metadata?.role)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Created: {new Date(user.created_at).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">
                    Permissions: {user.user_metadata?.permissions?.length || 0} modules
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(user)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPermissionsModal(user)}
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-3 w-3" />
                    Permissions
                  </Button>
                  
                  {user.id !== currentUser?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account with role and permissions.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem 
                      key={role.value} 
                      value={role.value}
                      disabled={role.value === 'owner' && currentUser?.user_metadata?.role !== 'owner'}
                    >
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePassword}
                >
                  Generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked }))}
              />
              <Label htmlFor="status">Active User</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem 
                      key={role.value} 
                      value={role.value}
                      disabled={role.value === 'owner' && currentUser?.user_metadata?.role !== 'owner'}
                    >
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="edit-password">New Password (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePassword}
                >
                  Generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave empty to keep current password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-status"
                checked={formData.status}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked }))}
              />
              <Label htmlFor="edit-status">Active User</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditUser} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedUser?.user_metadata?.full_name || selectedUser?.email}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={isPermissionsModalOpen} onOpenChange={setIsPermissionsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manage Permissions - {selectedUser?.user_metadata?.full_name}
            </DialogTitle>
            <DialogDescription>
              Select which modules this user can access. Owners have access to all modules by default.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {modules.map((module) => (
              <div key={module} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">{module}</span>
                </div>
                <Switch
                  checked={userPermissions[module] || false}
                  onCheckedChange={(checked) => {
                    if (selectedUser?.user_metadata?.role === 'owner') {
                      toast.error('Owners have access to all modules by default');
                      return;
                    }
                    setUserPermissions(prev => ({ ...prev, [module]: checked }));
                  }}
                  disabled={selectedUser?.user_metadata?.role === 'owner'}
                />
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePermissions} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Modal */}
      <Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              User Credentials
            </DialogTitle>
            <DialogDescription>
              Save these credentials securely. The password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          
          {generatedCredentials && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedCredentials.email} readOnly className="bg-muted" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCredentials.email, 'Email')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedCredentials.password} readOnly className="bg-muted font-mono" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCredentials.password, 'Password')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Name</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedCredentials.name} readOnly className="bg-muted" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCredentials.name, 'Name')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex items-center gap-2">
                  <Input value={generatedCredentials.role} readOnly className="bg-muted" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCredentials.role, 'Role')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={copyAllCredentials}>
              <Copy className="h-4 w-4 mr-2" />
              Copy All
            </Button>
            <Button onClick={() => setIsCredentialsModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;