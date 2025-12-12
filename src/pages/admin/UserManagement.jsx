import React, { useState, useEffect } from 'react';
import { getUsers, updateUser, deleteUser, getUserPermissions, setUserPermissions, addUser } from '../../services/UserService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPermissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'employee' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await getUsers();
      const transformedUsers = usersData.map(user => {
        const metaData = user.raw_user_meta_data || {};
        return {
          ...user,
          name: metaData.name,
          role: metaData.role,
        };
      });
      setUsers(transformedUsers);
    } catch (error) {
      toast.error('Failed to fetch users.');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser({ ...user });
    setEditModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const openPermissionsModal = async (user) => {
    try {
      const permissions = await getUserPermissions(user.id);
      setSelectedUser(user);
      setUserPermissions(permissions);
      setPermissionsModalOpen(true);
    } catch (error) {
      toast.error('Failed to fetch user permissions.');
    }
  };

  const handleAddUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddUserRoleChange = (value) => {
    setNewUser((prev) => ({ ...prev, role: value }));
  };

  const handleAddUser = async () => {
    try {
      await addUser(newUser.email, newUser.password, newUser.name, newUser.role);
      setAddUserModalOpen(false);
      setNewUser({ email: '', password: '', name: '', role: 'employee' });
      fetchUsers();
      toast.success('User added successfully!');
    } catch (error) {
      toast.error(`Error adding user: ${error.message}`);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.id, selectedUser.name, selectedUser.role);
      setEditModalOpen(false);
      fetchUsers();
      toast.success('User updated successfully!');
    } catch (error) {
      toast.error(`Error updating user: ${error.message}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id);
      setDeleteModalOpen(false);
      fetchUsers();
      toast.success('User deleted successfully!');
    } catch (error) {
      toast.error(`Error deleting user: ${error.message}`);
    }
  };

  const handlePermissionChange = (moduleId) => {
    setUserPermissions((prev) =>
      prev.map((p) => (p.module_id === moduleId ? { ...p, has_permission: !p.has_permission } : p))
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    try {
      const updatedModuleIds = userPermissions.filter((p) => p.has_permission).map((p) => p.module_id);
      await setUserPermissions(selectedUser.id, updatedModuleIds);
      setPermissionsModalOpen(false);
      fetchUsers();
      toast.success('Permissions updated successfully!');
    } catch (error) {
      toast.error('Error updating permissions.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setAddUserModalOpen(true)}>Add New User</Button>
      </div>
      <div className="flex flex-col gap-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center p-4 border rounded-lg shadow-sm">
            <div className="flex-1">
              <p className="font-bold">{user.name || 'No Name'}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <div className="flex-1">
              <p><strong>Role:</strong> {user.role || 'N/A'}</p>
              <p><strong>Permissions:</strong> {user.permission_count ?? 0} / 15</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => openPermissionsModal(user)}>Permissions</Button>
              <Button variant="outline" size="sm" onClick={() => openEditModal(user)}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={() => openDeleteModal(user)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setAddUserModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input name="name" placeholder="Name" value={newUser.name} onChange={handleAddUserChange} />
            <Input name="email" type="email" placeholder="Email" value={newUser.email} onChange={handleAddUserChange} />
            <Input name="password" type="password" placeholder="Password" value={newUser.password} onChange={handleAddUserChange} />
            <Select onValueChange={handleAddUserRoleChange} value={newUser.role}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="guide">Guide</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <Input
                placeholder="Name"
                value={selectedUser.name || ''}
                onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
              />
              <Select
                onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value })}
                value={selectedUser.role || 'employee'}
              >
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p>This action cannot be undone. This will permanently delete the user {selectedUser?.name || selectedUser?.email}.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={isPermissionsModalOpen} onOpenChange={setPermissionsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissions for {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {userPermissions.map((permission) => (
              <div key={permission.module_id} className="flex items-center space-x-2">
                <Checkbox
                  id={`perm-${permission.module_id}`}
                  checked={permission.has_permission}
                  onCheckedChange={() => handlePermissionChange(permission.module_id)}
                />
                <label htmlFor={`perm-${permission.module_id}`}>
                  <span className="mr-2">{permission.emoji || '▫️'}</span>
                  {permission.module_name}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePermissions}>Save Permissions</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;