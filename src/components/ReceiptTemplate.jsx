import React from 'react';

const ReceiptTemplate = ({ rental, logoUrl, stampUrl }) => {
  const calculateTotal = () => {
    const basePrice = rental.unit_price || rental.total_amount || 0;
    const overage = rental.overage_charge || 0;
    const extensions = rental.extensions?.reduce((sum, ext) => 
      ext.status === 'approved' ? sum + (ext.extension_price || 0) : sum, 0) || 0;
    return basePrice + overage + extensions;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div className="receipt-template p-8 bg-white" style={{ maxWidth: '210mm', margin: '0 auto' }}>
      {/* PATCH 1: HEADER - GREEN THEME, FINANCIAL FOCUS */}
      <div className="text-center mb-8">
        {logoUrl && (
          <img src={logoUrl} alt="SaharaX Rentals" className="h-16 mx-auto mb-4" />
        )}
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full inline-block mb-4">
          💰 PAYMENT RECEIPT
        </div>
        <h1 className="text-2xl font-bold text-gray-800">PAYMENT CONFIRMATION</h1>
        <p className="text-gray-600">Financial Document • Not a Legal Contract</p>
        <div className="mt-2 text-sm text-gray-500">
          <p>Ave. Mohammed El Yazidi 43 Sect. 12 Bur. 34-3 Riad Rabat</p>
          <p>contact@saharax.co | +212658888852</p>
        </div>
      </div>

      {/* PATCH 2: RECEIPT SUMMARY - CLEAN GRID */}
      <div className="border-t border-b border-gray-300 py-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">RECEIPT SUMMARY</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Receipt Number</p>
            <p className="font-medium">{rental.id || 'RNT-' + Date.now()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date Issued</p>
            <p className="font-medium">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Customer Name</p>
            <p className="font-medium">{rental.customer_name || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="font-medium">{rental.customer_phone || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* VEHICLE & RENTAL INFO - MINIMAL */}
      <div className="mb-6">
        <h3 className="text-md font-semibold text-gray-700 mb-2">Rental Information</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Vehicle</p>
              <p className="font-medium">{rental.vehicle?.name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rental Period</p>
              <p className="font-medium">
                {formatDate(rental.rental_start_date)} - {formatDate(rental.rental_end_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PATCH 3: PAYMENT BREAKDOWN - DETAILED */}
      <div className="mb-8">
        <h3 className="text-md font-semibold text-gray-700 mb-4">Payment Breakdown</h3>
        
        <div className="space-y-3">
          {/* Base Price */}
          <div className="flex justify-between py-2 border-b">
            <div>
              <p className="font-medium">Base Rental Rate</p>
              <p className="text-sm text-gray-600">
                {rental.rental_type === 'daily' ? 'Daily' : 
                 rental.rental_type === 'weekly' ? 'Weekly' : 
                 rental.rental_type === 'monthly' ? 'Monthly' : 'Hourly'} Rental
              </p>
            </div>
            <p className="font-medium">{formatCurrency(rental.unit_price || rental.total_amount || 0)} MAD</p>
          </div>

          {/* Overage Charge */}
          {rental.overage_charge > 0 && (
            <div className="flex justify-between py-2 border-b">
              <div>
                <p className="font-medium">Kilometer Overage</p>
                <p className="text-sm text-gray-600">
                  {rental.total_distance || 0} km total
                  {rental.package?.included_kilometers && ` (${rental.package.included_kilometers} km included)`}
                </p>
              </div>
              <p className="font-medium text-red-600">+{formatCurrency(rental.overage_charge)} MAD</p>
            </div>
          )}

          {/* Extensions */}
          {rental.extensions?.filter(ext => ext.status === 'approved').length > 0 && (
            <div className="py-2 border-b">
              <p className="font-medium mb-2">Extensions</p>
              {rental.extensions
                .filter(ext => ext.status === 'approved')
                .map((ext, index) => (
                  <div key={index} className="flex justify-between mb-1">
                    <p className="text-sm text-gray-600 pl-4">
                      +{ext.extension_hours} hours
                    </p>
                    <p className="text-sm font-medium">
                      {ext.paid ? '✅ PAID' : '⚠️ UNPAID'} {formatCurrency(ext.extension_price)} MAD
                    </p>
                  </div>
                ))}
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-between py-4 border-t-2 border-gray-300 mt-4">
            <div>
              <p className="text-lg font-bold text-gray-800">Grand Total</p>
              <p className="text-sm text-gray-600">All charges included</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(calculateTotal())} MAD</p>
          </div>
        </div>
      </div>

      {/* PATCH 4: PAYMENT STATUS - CLEAR VISUAL */}
      <div className="mb-8">
        <div className={`p-4 rounded-lg text-center ${
          rental.payment_status === 'paid' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <h3 className="text-lg font-bold mb-2">
            {rental.payment_status === 'paid' ? '✅ PAYMENT STATUS: PAID IN FULL' : '⚠️ PAYMENT STATUS: BALANCE DUE'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Deposit Paid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(rental.deposit_amount || 0)} MAD</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Remaining Balance</p>
              <p className={`text-xl font-bold ${
                (calculateTotal() - (rental.deposit_amount || 0)) > 0 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {formatCurrency(Math.max(0, calculateTotal() - (rental.deposit_amount || 0)))} MAD
              </p>
            </div>
          </div>

          {/* Payment Timeline */}
          {rental.payment_status === 'paid' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Payment completed on: {new Date().toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 💰 DAMAGE DEPOSIT SECTION */}
      {rental?.damage_deposit && rental.damage_deposit > 0 && (() => {
        const damageDeposit = parseFloat(rental.damage_deposit || 0);
        const remainingBalance = Math.max(0, calculateTotal() - (rental.deposit_amount || 0));
        const depositReturn = Math.max(0, damageDeposit - remainingBalance);
        
        return (
          <div className="mb-8">
            <div style={{ 
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderLeft: '4px solid #3b82f6',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: '#1e293b', 
                marginBottom: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px' 
              }}>
                <span style={{ fontSize: '20px' }}>💰</span>
                <span>Damage Deposit Information</span>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '10px',
                  padding: '8px 0'
                }}>
                  <span style={{ fontWeight: '500', color: '#475569', fontSize: '14px' }}>
                    Original Damage Deposit:
                  </span>
                  <span style={{ fontWeight: 'bold', color: '#1e293b', fontSize: '15px' }}>
                    {formatCurrency(damageDeposit)} MAD
                  </span>
                </div>
                
                {/* Show unpaid balance deduction if applicable */}
                {remainingBalance > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '10px',
                    padding: '8px 0',
                    color: '#dc2626' 
                  }}>
                    <span style={{ fontWeight: '500', fontSize: '14px' }}>
                      Less: Unpaid Balance:
                    </span>
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>
                      -{formatCurrency(remainingBalance)} MAD
                    </span>
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginTop: '15px', 
                  paddingTop: '15px', 
                  borderTop: '2px solid #cbd5e1', 
                  fontWeight: 'bold' 
                }}>
                  <span style={{ color: '#1e293b', fontSize: '16px' }}>
                    Amount to Return:
                  </span>
                  <span style={{ color: '#059669', fontSize: '18px' }}>
                    {formatCurrency(depositReturn)} MAD
                  </span>
                </div>
              </div>
              
              {/* Deposit Return Status */}
              {rental?.deposit_returned_at && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '15px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '8px',
                  border: '1px solid #10b981'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginBottom: '8px' 
                  }}>
                    <span style={{ fontWeight: '600', color: '#065f46', fontSize: '14px' }}>
                      ✅ Deposit Returned:
                    </span>
                    <span style={{ 
                      color: '#059669', 
                      fontWeight: 'bold', 
                      fontSize: '16px' 
                    }}>
                      {formatCurrency(rental?.deposit_return_amount || depositReturn)} MAD
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    Date: {formatDate(rental?.deposit_returned_at)}
                  </div>
                  {rental?.deposit_deduction_amount > 0 && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#dc2626', 
                      marginTop: '5px',
                      fontStyle: 'italic'
                    }}>
                      Note: {formatCurrency(rental.deposit_deduction_amount)} MAD deducted for unpaid balance
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* PATCH 5: COMPANY VERIFICATION - NO CUSTOMER SIGNATURE */}
      <div className="mt-12 pt-8 border-t border-gray-300">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-gray-600 mb-2">Issued by</p>
            <div className="flex items-center gap-3">
              {stampUrl && (
                <img 
                  src={stampUrl} 
                  alt="Company Verification" 
                  className="h-16 w-16 opacity-80"
                />
              )}
              <div>
                <p className="font-bold text-gray-800">SaharaX Rentals</p>
                <p className="text-sm text-gray-600">Authorized Representative</p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">Verification Code</p>
            <p className="font-mono text-lg font-bold text-gray-800">
              {rental.id?.slice(-8) || 'VERIFIED'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Document ID: {Date.now()}</p>
          </div>
        </div>

        {/* IMPORTANT NOTE */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            <strong>NOTE:</strong> This is a payment receipt only. For rental terms and conditions, 
            please refer to your signed rental contract.
          </p>
        </div>
      </div>

      {/* PATCH 6: FOOTER - SIMPLE */}
      <div className="mt-8 pt-6 border-t border-gray-300 text-center">
        <p className="text-sm text-gray-600">
          Thank you for choosing SaharaX Rentals. For any questions, contact +212658888852
        </p>
        <p className="text-xs text-gray-500 mt-2">
          This receipt is electronically generated and does not require a signature.
        </p>
      </div>
    </div>
  );
};

export default ReceiptTemplate;