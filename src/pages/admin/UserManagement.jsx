import React, { useState, useEffect, useCallback } from 'react';
import { supabaseAdmin, supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile } from '../../services/UserService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, ShieldAlert, Pencil } from 'lucide-react';

// STANDARDIZED MODULE NAMES - Source of Truth
const modules = [
  'Dashboard', 'Calendar', 'Tours & Bookings', 'Rental Management', 'Customer Management', 
  'Fleet Management', 'Pricing Management', 'Quad Maintenance', 'Fuel Logs', 'Inventory', 
  'Finance Management', 'Alerts', 'User & Role Management', 'System Settings', 'Project Export'
];

const UserManagement = () => {
  const { user: currentUser, loading: authLoading, initialized } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setEditUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'employee' });
  const [editUser, setEditUser] = useState({ email: '', name: '', role: '', password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUserPermissions, setNewUserPermissions] = useState(
    modules.reduce((acc, module) => ({ ...acc, [module]: true }), {})
  );
  const [isPermissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  useEffect(() => {
    if (initialized) {
      console.log("Auth Initialized. Current User:", currentUser);
    }
  }, [initialized, currentUser]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    console.log("=== fetchUsers called ===");
    
    if (!supabaseAdmin) {
      console.error("supabaseAdmin is not initialized");
      toast.error("Supabase admin client is not initialized. Check service role key.");
      setLoading(false);
      return;
    }
    
    console.log("supabaseAdmin exists:", !!supabaseAdmin);
    
    try {
      console.log("Calling supabaseAdmin.auth.admin.listUsers()...");
      const { data: { users: usersData }, error } = await supabaseAdmin.auth.admin.listUsers();
      
      console.log("listUsers response - data:", usersData);
      console.log("listUsers response - error:", error);
      
      if (error) {
        console.error("Error from listUsers:", error);
        throw error;
      }
      
      const transformedUsers = usersData.map(user => ({
        ...user,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'No Name',
        role: user.user_metadata?.role || 'N/A',
      }));

      console.log("Transformed users:", transformedUsers);
      setUsers(transformedUsers);
      toast.success(`Loaded ${transformedUsers.length} users`);
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      toast.error(`Failed to fetch users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized && currentUser?.role === 'owner') {
      fetchUsers();
    } else if (initialized) {
      setLoading(false);
    }
  }, [initialized, currentUser, fetchUsers]);

  const handlePermissionChange = (module, checked) => {
    setNewUserPermissions(prev => ({ ...prev, [module]: checked }));
  };

  const handleEditPermissionChange = (module, checked) => {
    setEditPermissions(prev => ({ ...prev, [module]: checked }));
  };
  
  const handleRoleChange = (role) => {
    setNewUser(p => ({ ...p, role: role }));
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';
    const updatedPermissions = modules.reduce((acc, module) => {
        if (isOwnerOrAdmin) {
            acc[module] = true;
        } else {
            const isRestricted = module === 'User & Role Management' || module === 'System Settings';
            acc[module] = !isRestricted;
        }
        return acc;
    }, {});
    setNewUserPermissions(updatedPermissions);
  };

  const handleAddUser = async () => {
    console.log("=== handleAddUser START ===");
    
    if (currentUser.role !== 'owner') {
        console.error("User is not owner. Current role:", currentUser.role);
        toast.error("Only owners can add new users.");
        return;
    }

    if (!newUser.email || !newUser.password || !newUser.name) {
        console.error("Missing required fields:", { email: !!newUser.email, password: !!newUser.password, name: !!newUser.name });
        toast.error("Please fill in all fields: Full Name, Email, and Password.");
        return;
    }

    if (!supabaseAdmin) {
        console.error("supabaseAdmin is not initialized");
        toast.error("Admin client not initialized. Cannot create user.");
        return;
    }

    console.log("All validations passed. Creating user...");
    console.log("newUser data:", JSON.stringify(newUser, null, 2));

    setIsSubmitting(true);
    
    try {
        console.log("Calling supabaseAdmin.auth.admin.createUser...");
        
        const createUserPayload = {
            email: newUser.email,
            password: newUser.password,
            email_confirm: true,
            user_metadata: { 
                full_name: newUser.name,
                role: newUser.role.toLowerCase(),
                status: 'active'
            },
        };
        
        console.log("createUser payload:", JSON.stringify(createUserPayload, null, 2));
        
        const { data, error } = await supabaseAdmin.auth.admin.createUser(createUserPayload);

        console.log("createUser response - data:", data);
        console.log("createUser response - error:", error);

        if (error) {
            console.error("Error creating user:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            throw error;
        }
        
        if (!data || !data.user) {
            console.error("No user data returned from createUser");
            throw new Error("User creation failed - no user data returned");
        }
        
        console.log("User created successfully:", data.user);
        console.log("User ID:", data.user.id);
        console.log("User email:", data.user.email);
        
        const assignedModules = Object.entries(newUserPermissions)
            .filter(([, hasAccess]) => hasAccess)
            .map(([moduleName]) => moduleName);

        console.log(`User ${data.user.id} created. Assigned modules:`, assignedModules);

        // Close modal and reset form
        setAddUserModalOpen(false);
        setNewUser({ email: '', password: '', name: '', role: 'employee' });
        
        // Refresh user list
        console.log("Refreshing user list...");
        await fetchUsers();
        
        toast.success(`User ${newUser.name} added successfully!`);
        console.log("=== handleAddUser SUCCESS ===");
    } catch (error) {
        console.error("=== handleAddUser ERROR ===");
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Full error object:", JSON.stringify(error, null, 2));
        
        toast.error(`Error adding user: ${error.message || 'Unknown error occurred'}`);
    } finally {
        setIsSubmitting(false);
        console.log("=== handleAddUser END ===");
    }
  };

  const openEditModal = (user) => {
    console.log("=== openEditModal ===");
    console.log("User to edit:", user);
    
    setSelectedUser(user);
    setEditUser({
      email: user.email || '',
      name: user.name || '',
      role: user.role || 'employee',
      password: '',
      confirmPassword: ''
    });
    setEditUserModalOpen(true);
  };

  const handleEditUser = async () => {
    console.log("=== handleEditUser START ===");
    
    if (currentUser.role !== 'owner') {
        console.error("User is not owner. Current role:", currentUser.role);
        toast.error("Only owners can edit users.");
        return;
    }

    // Validation
    if (!editUser.email || !editUser.name || !editUser.role) {
        toast.error("Please fill in all required fields: Full Name, Email, and Role.");
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUser.email)) {
        toast.error("Please enter a valid email address.");
        return;
    }

    // Password validation (if provided)
    if (editUser.password) {
        if (editUser.password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }
        if (editUser.password !== editUser.confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
    }

    // Prevent users from editing their own role
    if (selectedUser.id === currentUser.id && editUser.role !== selectedUser.role) {
        toast.error("You cannot change your own role.");
        return;
    }

    setIsSubmitting(true);
    
    try {
        console.log("Updating user:", selectedUser.id);
        console.log("Update data:", { 
            email: editUser.email, 
            name: editUser.name, 
            role: editUser.role,
            hasPassword: !!editUser.password 
        });

        const updates = {
            email: editUser.email,
            name: editUser.name,
            role: editUser.role.toLowerCase()
        };

        // Only include password if provided
        if (editUser.password && editUser.password.trim() !== '') {
            updates.password = editUser.password;
        }

        await updateUserProfile(selectedUser.id, updates);
        
        // Close modal and reset form
        setEditUserModalOpen(false);
        setEditUser({ email: '', name: '', role: '', password: '', confirmPassword: '' });
        setSelectedUser(null);
        
        // Refresh user list
        await fetchUsers();
        
        toast.success(`User updated successfully!`);
        console.log("=== handleEditUser SUCCESS ===");
    } catch (error) {
        console.error("=== handleEditUser ERROR ===");
        console.error("Error:", error);
        toast.error(`Error updating user: ${error.message || 'Unknown error occurred'}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !supabaseAdmin) return;
    
    console.log("=== handleDeleteUser START ===");
    console.log("Deleting user:", selectedUser.id);
    
    try {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(selectedUser.id);
      
      console.log("deleteUser response - error:", error);
      
      if (error) {
        console.error("Error deleting user:", error);
        throw error;
      }
      
      setDeleteModalOpen(false);
      await fetchUsers();
      toast.success('User deleted successfully!');
      console.log("=== handleDeleteUser SUCCESS ===");
    } catch (error) {
      console.error("=== handleDeleteUser ERROR ===");
      console.error("Error:", error);
      toast.error(`Error deleting user: ${error.message}`);
    }
  };

  const openPermissionsModal = async (user) => {
    console.log("=== openPermissionsModal START ===");
    console.log("Fetching permissions for user ID:", user.id);
    console.log("User object:", user);
    
    // Clear state before loading new data
    setEditPermissions({});
    setSelectedUserForPermissions(user);
    setIsLoadingPermissions(true);
    setPermissionsModalOpen(true);
    
    try {
      // Fix the Fetch: Use .maybeSingle() to handle empty state gracefully
      const { data, error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_users')
        .select('permissions')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log("Fetch result - data:", data);
      console.log("Fetch result - error:", error);
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching permissions:', error);
        throw error;
      }
      
      // Handle case when no row exists
      if (!data) {
        console.warn('No permissions row found for user:', user.id);
        // State Management: Default to all FALSE
        const defaultPermissions = {};
        modules.forEach(m => defaultPermissions[m] = false);
        setEditPermissions(defaultPermissions);
        return;
      }
      
      // The 'Merge' Strategy: Merge database permissions with master modules list
      // Missing keys are treated as false, not true
      const dbPermissions = data?.permissions || {};
      const merged = {};
      modules.forEach(m => {
        merged[m] = dbPermissions[m] === true; // Explicitly check for true
      });
      
      console.log("Merged permissions:", merged);
      setEditPermissions(merged);
    } catch (error) {
      console.error('Error loading permissions:', error);
      toast.error(`Failed to load permissions: ${error.message}`);
      // State Management: Default to all FALSE if error
      const defaultPermissions = {};
      modules.forEach(m => defaultPermissions[m] = false);
      setEditPermissions(defaultPermissions);
    } finally {
      setIsLoadingPermissions(false);
      console.log("=== openPermissionsModal END ===");
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUserForPermissions) return;
    
    console.log("=== handleUpdatePermissions START ===");
    console.log("Selected user ID:", selectedUserForPermissions.id);
    console.log("Current editPermissions (raw):", editPermissions);
    
    setIsSubmitting(true);
    
    try {
      // DATA SAFETY: Ensure permissions are saved as JSON Object (not array)
      // Explicit False Values: Ensure all modules are included with explicit true/false
      const completePermissions = {};
      modules.forEach(module => {
        completePermissions[module] = editPermissions[module] === true;
      });
      
      console.log("✅ Complete permissions to save (JSON Object):", completePermissions);
      console.log("✅ Permissions type check:", typeof completePermissions);
      console.log("✅ Is Array?", Array.isArray(completePermissions));
      console.log("✅ Is Object?", completePermissions !== null && typeof completePermissions === 'object' && !Array.isArray(completePermissions));
      
      // DEBUG: Log the exact payload before upsert
      const upsertPayload = {
        id: selectedUserForPermissions.id,
        email: selectedUserForPermissions.email,
        full_name: selectedUserForPermissions.name,
        role: selectedUserForPermissions.role,
        access_enabled: true,
        permissions: completePermissions
      };
      
      console.log("🔍 UPSERT PAYLOAD (before database call):");
      console.log("   - user_id:", upsertPayload.id);
      console.log("   - email:", upsertPayload.email);
      console.log("   - full_name:", upsertPayload.full_name);
      console.log("   - role:", upsertPayload.role);
      console.log("   - permissions:", JSON.stringify(upsertPayload.permissions, null, 2));
      
      // The Upsert Strategy: Use upsert instead of update
      const { error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_users')
        .upsert(upsertPayload, { onConflict: 'id' });
      
      console.log("Upsert permissions response - error:", error);
      
      if (error) throw error;
      
      setPermissionsModalOpen(false);
      toast.success(`Permissions updated for ${selectedUserForPermissions.name}`);
      console.log("=== handleUpdatePermissions SUCCESS ===");
    } catch (error) {
      console.error('=== handleUpdatePermissions ERROR ===');
      console.error('Error updating permissions:', error);
      toast.error(`Failed to update permissions: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !initialized) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Verifying credentials...</p>
      </div>
    );
  }

  if (currentUser?.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page. Please contact an administrator.</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setAddUserModalOpen(true)}>Add New User</Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No Users Found</h2>
          <p className="text-muted-foreground mt-2">Click "Add New User" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
              <div className="flex-1 mb-4">
                <p className="font-bold text-lg">{user.name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="mb-4">
                <p><strong>Role:</strong> <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">{user.role}</span></p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => openPermissionsModal(user)}>Permissions</Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteModal(user)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setAddUserModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription className="sr-only">
              Dialog for adding a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Full Name</Label>
              <Input id="name" name="name" placeholder="Full Name" onChange={(e) => setNewUser(p => ({...p, name: e.target.value}))} value={newUser.name} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" name="email" type="email" placeholder="Email" onChange={(e) => setNewUser(p => ({...p, email: e.target.value}))} value={newUser.email} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Password" onChange={(e) => setNewUser(p => ({...p, password: e.target.value}))} value={newUser.password} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select onValueChange={handleRoleChange} value={newUser.role}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div>
                <Label className="text-sm font-medium">Module Permissions</Label>
                <div className="grid grid-cols-2 gap-4 rounded-md border p-4 mt-2 max-h-60 overflow-y-auto">
                    {modules.map((module) => (
                        <div key={module} className="flex items-center space-x-2">
                            <Checkbox
                                id={`perm-${module}`}
                                checked={newUserPermissions[module]}
                                onCheckedChange={(checked) => handlePermissionChange(module, checked)}
                                disabled={newUser.role === 'owner' || newUser.role === 'admin'}
                            />
                            <Label htmlFor={`perm-${module}`} className="text-sm font-normal">{module}</Label>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Adding...' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditUserModalOpen} onOpenChange={setEditUserModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription className="sr-only">
              Dialog for editing user information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-left sm:text-right">Full Name</Label>
              <Input 
                id="edit-name" 
                name="name" 
                placeholder="Full Name" 
                onChange={(e) => setEditUser(p => ({...p, name: e.target.value}))} 
                value={editUser.name} 
                className="col-span-1 sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-left sm:text-right">Email</Label>
              <Input 
                id="edit-email" 
                name="email" 
                type="email" 
                placeholder="Email" 
                onChange={(e) => setEditUser(p => ({...p, email: e.target.value}))} 
                value={editUser.email} 
                className="col-span-1 sm:col-span-3" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-left sm:text-right">Role</Label>
              <Select 
                onValueChange={(role) => setEditUser(p => ({...p, role}))} 
                value={editUser.role}
                disabled={selectedUser?.id === currentUser?.id}
              >
                <SelectTrigger className="col-span-1 sm:col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedUser?.id === currentUser?.id && (
              <div className="text-sm text-muted-foreground italic">
                Note: You cannot change your own role.
              </div>
            )}
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-2 block">Change Password (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-3">Leave blank to keep current password</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-password" className="text-left sm:text-right">New Password</Label>
              <Input 
                id="edit-password" 
                name="password" 
                type="password" 
                placeholder="New Password (min 6 chars)" 
                onChange={(e) => setEditUser(p => ({...p, password: e.target.value}))} 
                value={editUser.password} 
                className="col-span-1 sm:col-span-3" 
              />
            </div>
            {editUser.password && (
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-confirm-password" className="text-left sm:text-right">Confirm Password</Label>
                <Input 
                  id="edit-confirm-password" 
                  name="confirmPassword" 
                  type="password" 
                  placeholder="Confirm New Password" 
                  onChange={(e) => setEditUser(p => ({...p, confirmPassword: e.target.value}))} 
                  value={editUser.confirmPassword} 
                  className="col-span-1 sm:col-span-3" 
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditUserModalOpen(false)} disabled={isSubmitting} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleEditUser} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription className="sr-only">
              Dialog for confirming user deletion
            </DialogDescription>
          </DialogHeader>
          <p>This will permanently delete the user <span className="font-bold">{selectedUser?.name || selectedUser?.email}</span>. This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={isPermissionsModalOpen} onOpenChange={setPermissionsModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {selectedUserForPermissions?.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Dialog for managing user module permissions
            </DialogDescription>
          </DialogHeader>
          {isLoadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="ml-2">Loading permissions...</p>
            </div>
          ) : (
            <div className="py-4">
              <Label className="text-sm font-medium">Module Permissions</Label>
              <div className="grid grid-cols-2 gap-4 rounded-md border p-4 mt-2 max-h-96 overflow-y-auto">
                {modules.map((module) => (
                  <div key={module} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-perm-${module}`}
                      checked={editPermissions[module] === true}
                      onCheckedChange={(checked) => handleEditPermissionChange(module, checked)}
                    />
                    <Label htmlFor={`edit-perm-${module}`} className="text-sm font-normal">{module}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleUpdatePermissions} disabled={isSubmitting || isLoadingPermissions}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Saving...' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;