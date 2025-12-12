import React from 'react';
import { X, Mail, Phone, Calendar, Shield } from 'lucide-react';
import OptimizedAvatar from '../common/OptimizedAvatar';

const UserDetailsModal = ({ user, isOpen, onClose }) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">User Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-center mb-6">
            <OptimizedAvatar 
              src={user.avatarUrl}
              name={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email}
              size={80}
              className="mr-4"
            />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-gray-600">{user.email}</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${
                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                user.role === 'guide' ? 'bg-green-100 text-green-800' :
                user.role === 'employee' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.role || 'User'}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-gray-400 mr-3" />
              <span className="text-sm text-gray-900">{user.email}</span>
            </div>
            
            {user.phone && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-400 mr-3" />
                <span className="text-sm text-gray-900">{user.phone}</span>
              </div>
            )}
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-400 mr-3" />
              <span className="text-sm text-gray-900">
                Joined {user.dateJoined ? new Date(user.dateJoined).toLocaleDateString() : 'Unknown'}
              </span>
            </div>
            
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-gray-400 mr-3" />
              <span className="text-sm text-gray-900">
                Status: {user.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Additional Info */}
          {user.position && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Position</h4>
              <p className="text-sm text-gray-600">{user.position}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;