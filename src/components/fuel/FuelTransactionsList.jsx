import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Car, 
  Fuel, 
  Calendar, 
  MapPin, 
  User, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  RefreshCw
} from 'lucide-react';
import FuelTransactionService from '../../services/FuelTransactionService';

const FuelTransactionsList = ({ 
  filters, 
  vehicles, 
  onAddTransaction, 
  onViewDetails 
}) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20
  });

  useEffect(() => {
    loadTransactions();
  }, [filters, pagination.currentPage]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const offset = (pagination.currentPage - 1) * pagination.limit;
      
      const result = await FuelTransactionService.getAllTransactions({
        ...filters,
        limit: pagination.limit,
        offset
      });

      if (result.success) {
        setTransactions(result.transactions);
        setPagination(prev => ({
          ...prev,
          totalCount: result.totalCount,
          totalPages: Math.ceil(result.totalCount / prev.limit)
        }));
      } else {
        console.error('Error loading transactions:', result.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Unexpected error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const result = await FuelTransactionService.exportToCSV(filters);
      
      if (result.success) {
        // Create and download CSV file
        const blob = new Blob([result.csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Error exporting CSV:', result.error);
      }
    } catch (error) {
      console.error('Unexpected error exporting CSV:', error);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '0.00 MAD';
    return `${parseFloat(amount).toFixed(2)} MAD`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      timeZone: 'Africa/Casablanca',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      timeZone: 'Africa/Casablanca',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeIcon = (type) => {
    switch (type) {
      case 'tank_refill':
        return <Plus className="w-3 h-3 mr-1" />;
      case 'vehicle_refill':
        return <Car className="w-3 h-3 mr-1" />;
      case 'withdrawal':
        return <Minus className="w-3 h-3 mr-1" />;
      default:
        return <Fuel className="w-3 h-3 mr-1" />;
    }
  };

  const getTransactionTypeLabel = (type) => {
    return FuelTransactionService.getTransactionTypeLabel(type);
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'tank_refill':
        return 'bg-green-100 text-green-800';
      case 'vehicle_refill':
        return 'bg-blue-100 text-blue-800';
      case 'withdrawal':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getVehicleName = (transaction) => {
    if (transaction.saharax_0u4w4d_vehicles) {
      return transaction.saharax_0u4w4d_vehicles.name;
    }
    return '—';
  };

  const getVehiclePlate = (transaction) => {
    if (transaction.saharax_0u4w4d_vehicles) {
      return transaction.saharax_0u4w4d_vehicles.plate_number;
    }
    return '';
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-600">
            Showing {transactions.length} of {pagination.totalCount} transactions
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadTransactions}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Station/Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Fuel className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                      <p className="text-gray-500 mb-4">
                        {Object.values(filters).some(v => v) 
                          ? 'Try adjusting your filters to see more results.'
                          : 'Start by adding your first fuel transaction.'
                        }
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAddTransaction('tank_refill')}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Tank Refill
                        </button>
                        <button
                          onClick={() => onAddTransaction('withdrawal')}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                          Add Withdrawal
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(transaction.transaction_date)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatTime(transaction.transaction_date)}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                        {getTransactionTypeIcon(transaction.transaction_type)}
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Car className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getVehicleName(transaction)}
                          </div>
                          {getVehiclePlate(transaction) && (
                            <div className="text-sm text-gray-500">
                              {getVehiclePlate(transaction)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Fuel className="w-4 h-4 text-blue-500 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.amount}L
                          </div>
                          <div className="text-sm text-gray-500">
                            {transaction.fuel_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(transaction.cost)}
                      </div>
                      {transaction.amount > 0 && transaction.cost > 0 && (
                        <div className="text-sm text-gray-500">
                          {formatCurrency(transaction.cost / transaction.amount)}/L
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {transaction.fuel_station && (
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.fuel_station}
                          </div>
                        )}
                        {transaction.location && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="w-3 h-3 mr-1" />
                            {transaction.location}
                          </div>
                        )}
                        {!transaction.fuel_station && !transaction.location && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.odometer_reading && (
                          <div className="flex items-center">
                            <Car className="w-3 h-3 text-gray-400 mr-1" />
                            {transaction.odometer_reading}km
                          </div>
                        )}
                        {transaction.filled_by && (
                          <div className="flex items-center">
                            <User className="w-3 h-3 text-gray-400 mr-1" />
                            {transaction.filled_by}
                          </div>
                        )}
                        {!transaction.odometer_reading && !transaction.filled_by && (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewDetails(transaction)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onAddTransaction(transaction.transaction_type, transaction)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Transaction"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalCount}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNumber;
                    if (pagination.totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNumber = pagination.totalPages - 4 + i;
                    } else {
                      pageNumber = pagination.currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNumber === pagination.currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FuelTransactionsList;