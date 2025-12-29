/**
 * Extension History Component
 * Displays all extensions for a rental with approval status
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';

const ExtensionHistory = ({ extensions, onApprove, onReject, isAdmin }) => {
  if (!extensions || extensions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No extension history available</p>
        </CardContent>
      </Card>
    );
  }

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
      active: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Active' },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle, label: 'Completed' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Extension History ({extensions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {extensions.map((extension, index) => (
            <div
              key={extension.id}
              className={`p-4 border rounded-lg ${
                extension.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Extension #{index + 1}
                  </p>
                  <p className="text-xs text-gray-500">
                    Requested: {formatDate(extension.requested_at)}
                  </p>
                </div>
                {getStatusBadge(extension.status)}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-600">Duration</p>
                  <p className="text-sm font-medium text-gray-900">
                    {extension.extension_hours} {extension.extension_hours === 1 ? 'hour' : 'hours'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Price</p>
                  <p className="text-sm font-medium text-blue-600">
                    {formatPrice(extension.extension_price)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Method</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {extension.calculation_method}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Source</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {extension.price_source}
                  </p>
                </div>
              </div>

              {/* Tier Breakdown */}
              {extension.tier_breakdown && Array.isArray(extension.tier_breakdown) && extension.tier_breakdown.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                  <p className="font-medium text-gray-700 mb-1">Price Breakdown:</p>
                  <div className="space-y-1">
                    {extension.tier_breakdown.map((tier, idx) => (
                      <div key={idx} className="flex justify-between text-gray-600">
                        <span>
                          {tier.hours_in_tier}h × {formatPrice(tier.rate_per_hour)}
                          {tier.discount_percentage > 0 && (
                            <span className="ml-1 text-green-600">({tier.discount_percentage}% off)</span>
                          )}
                        </span>
                        <span className="font-medium">{formatPrice(tier.tier_total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {extension.notes && (
                <div className="mb-3 p-2 bg-blue-50 border-l-2 border-blue-400 rounded text-xs">
                  <p className="font-medium text-blue-900">Notes:</p>
                  <p className="text-blue-800">{extension.notes}</p>
                </div>
              )}

              {/* Approval Info */}
              {extension.approved_at && (
                <div className="text-xs text-gray-600">
                  <p>
                    {extension.status === 'approved' ? 'Approved' : 'Processed'} on: {formatDate(extension.approved_at)}
                  </p>
                </div>
              )}

              {/* Admin Actions for Pending Extensions */}
              {extension.status === 'pending' && isAdmin && onApprove && onReject && (
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <button
                    onClick={() => onApprove(extension.id)}
                    className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(extension.id)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExtensionHistory;