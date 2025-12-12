import React from 'react';
import { X, Calendar, Car, Fuel, Calculator, DollarSign, Upload, Image as ImageIcon, FileText, Trash2, Eye, Download } from 'lucide-react';

const TransactionDetailsModal = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null;

  const handleImageView = (imageData) => {
    if (!imageData) return;

    try {
      let imageUrl = null;
      
      // Handle new Supabase Storage format
      if (imageData.type === 'storage' && imageData.url) {
        imageUrl = imageData.url;
      }
      // Handle old base64 format
      else if (imageData.type === 'base64' && imageData.data) {
        imageUrl = imageData.data;
      }
      // Handle legacy base64 format (direct base64 string)
      else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        imageUrl = imageData;
      }
      // Handle direct URL format
      else if (typeof imageData === 'string' && (imageData.startsWith('http') || imageData.startsWith('/'))) {
        imageUrl = imageData;
      }

      if (imageUrl) {
        // Open image in new tab for viewing
        const newWindow = window.open();
        newWindow.document.write(`
          <html>
            <head>
              <title>Invoice Image - ${transaction.saharax_0u4w4d_vehicles?.name || transaction.vehicle?.name || 'Vehicle'}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  background: #f5f5f5; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh;
                  font-family: Arial, sans-serif;
                }
                img { 
                  max-width: 100%; 
                  max-height: 90vh; 
                  object-fit: contain; 
                  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  background: white;
                  border-radius: 8px;
                }
                .error {
                  text-align: center;
                  color: #666;
                  padding: 40px;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
              </style>
            </head>
            <body>
              <img src="${imageUrl}" alt="Invoice Image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div class="error" style="display: none;">
                <h3>Unable to display image</h3>
                <p>The image file may be corrupted or in an unsupported format.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Error viewing image:', error);
      alert('Unable to display the image. The file may be corrupted.');
    }
  };

  const handleImageDownload = (imageData) => {
    if (!imageData) return;

    try {
      let downloadUrl = null;
      let filename = 'invoice';
      
      // Handle new Supabase Storage format
      if (imageData.type === 'storage' && imageData.url) {
        downloadUrl = imageData.url;
        filename = imageData.name || `invoice-${transaction.id}`;
      }
      // Handle old base64 format
      else if (imageData.type === 'base64' && imageData.data) {
        downloadUrl = imageData.data;
        filename = imageData.name || `invoice-${transaction.id}`;
      }
      // Handle legacy base64 format (direct base64 string)
      else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        downloadUrl = imageData;
        filename = `invoice-${transaction.id}.jpg`;
      }

      if (downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Unable to download the image. The file may be corrupted.');
    }
  };

  const renderInvoiceImage = () => {
    const imageData = transaction.invoice_image;
    
    if (!imageData) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p>No invoice image uploaded</p>
        </div>
      );
    }

    // Determine if it's an image or PDF
    let isImage = false;
    let contentType = '';
    
    if (imageData.contentType) {
      contentType = imageData.contentType;
      isImage = contentType.startsWith('image/');
    } else if (imageData.type === 'base64' && imageData.data) {
      isImage = imageData.data.startsWith('data:image/');
      contentType = isImage ? 'image' : 'application/pdf';
    } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      isImage = imageData.startsWith('data:image/');
      contentType = isImage ? 'image' : 'application/pdf';
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-blue-500" />
            ) : (
              <FileText className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {imageData.name || `Invoice ${isImage ? 'Image' : 'Document'}`}
            </span>
            {imageData.size && (
              <span className="text-xs text-gray-500">
                ({(imageData.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => handleImageView(imageData)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View
          </button>
          <button
            onClick={() => handleImageDownload(imageData)}
            className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>

        {/* Show preview for images */}
        {isImage && (
          <div className="mt-3">
            <div className="border border-gray-200 rounded-lg p-2 bg-gray-50">
              {imageData.type === 'storage' && imageData.url ? (
                <img
                  src={imageData.url}
                  alt="Invoice preview"
                  className="w-full h-32 object-contain rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
              ) : imageData.type === 'base64' && imageData.data ? (
                <img
                  src={imageData.data}
                  alt="Invoice preview"
                  className="w-full h-32 object-contain rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
              ) : typeof imageData === 'string' && imageData.startsWith('data:') ? (
                <img
                  src={imageData}
                  alt="Invoice preview"
                  className="w-full h-32 object-contain rounded"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <div className="text-center py-4 text-gray-500 text-sm" style={{ display: 'none' }}>
                Preview not available
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Get the correct date field - from debug info, we know transaction_date works
  const getDate = () => {
    return transaction.transaction_date || transaction.refill_date || transaction.date || transaction.created_at;
  };

  // Get the correct vehicle info - from debug info, we see saharax_0u4w4d_vehicles structure
  const getVehicleInfo = () => {
    const vehicle = transaction.saharax_0u4w4d_vehicles || transaction.vehicle;
    if (!vehicle) return 'N/A';
    
    let info = vehicle.name || 'Unknown Vehicle';
    if (vehicle.model) info += ` - ${vehicle.model}`;
    if (vehicle.plate_number) info += ` (${vehicle.plate_number})`;
    return info;
  };

  // Get the correct liters value - from debug info, we need to use 'amount' field
  const getLiters = () => {
    return transaction.amount || transaction.liters_added || transaction.liters || transaction.quantity || 0;
  };

  // Get the correct price per liter - calculate from cost and amount
  const getPricePerLiter = () => {
    const cost = parseFloat(transaction.cost) || 0;
    const amount = parseFloat(transaction.amount) || 0;
    if (cost > 0 && amount > 0) {
      return (cost / amount).toFixed(2);
    }
    return transaction.price_per_liter || transaction.unit_price || 0;
  };

  // Get total cost - from debug info, we know 'cost' field has the value
  const getTotalCost = () => {
    return parseFloat(transaction.cost) || parseFloat(transaction.total_cost) || 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Vehicle Refill Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </label>
                <p className="text-gray-900">
                  {getDate() ? new Date(getDate()).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle
                </label>
                <p className="text-gray-900">
                  {getVehicleInfo()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Fuel className="h-4 w-4" />
                  Quantity
                </label>
                <p className="text-gray-900">
                  {getLiters()} L
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Price per Liter
                </label>
                <p className="text-gray-900">
                  {getPricePerLiter()} MAD
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Total Cost
                </label>
                <p className="text-gray-900 font-semibold">
                  {getTotalCost().toFixed(2)} MAD
                </p>
              </div>

              {(transaction.odometer_km || transaction.odometer_reading) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Odometer
                  </label>
                  <p className="text-gray-900">
                    {transaction.odometer_km || transaction.odometer_reading} km
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {transaction.notes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-md">
                {transaction.notes}
              </p>
            </div>
          )}

          {/* Invoice Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Invoice
            </label>
            {renderInvoiceImage()}
          </div>

          {/* Metadata */}
          <div className="text-xs text-gray-500 pt-4 border-t">
            <p>
              Created: {transaction.created_at ? new Date(transaction.created_at).toLocaleString() : 'N/A'}
            </p>
            {transaction.updated_at && transaction.updated_at !== transaction.created_at && (
              <p>
                Updated: {new Date(transaction.updated_at).toLocaleString()}
              </p>
            )}
            <p>
              Transaction ID: {transaction.id}
            </p>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;