import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertTriangle, Clock, DollarSign, CheckCircle } from 'lucide-react';
import ExtensionPricingService from '../../services/ExtensionPricingService';
import { canApprovePriceOverrides } from '../../utils/permissionHelpers';

export default function ExtensionRequestModal({ isOpen, onClose, rental, onExtensionCreated, currentUser }) {
  const [selectedHours, setSelectedHours] = useState(1);
  const [priceCalculation, setPriceCalculation] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [manualPriceOverride, setManualPriceOverride] = useState(false);
  const [customPrice, setCustomPrice] = useState('');

  const isAdmin = canApprovePriceOverrides(currentUser);
  const hourOptions = [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (isOpen && rental?.id && selectedHours > 0) {
      calculatePrice();
    }
  }, [isOpen, rental?.id, selectedHours]);

  const calculatePrice = async () => {
    if (!rental?.id || selectedHours <= 0) return;

    setIsCalculating(true);
    setError(null);

    try {
      const result = await ExtensionPricingService.calculateExtensionPrice(rental.id, selectedHours);
      console.log('💰 Price calculation result:', result);
      setPriceCalculation(result);
      setCustomPrice(result.extension_price?.toString() || result.totalPrice?.toString() || '0');
    } catch (err) {
      console.error('❌ Error calculating price:', err);
      setError(`Failed to calculate price: ${err.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSubmit = async (autoApprove = false) => {
    if (!rental?.id || !priceCalculation) {
      setError('Missing required data');
      return;
    }

    const finalPrice = manualPriceOverride ? parseFloat(customPrice) : (priceCalculation.extension_price || priceCalculation.totalPrice || 0);

    if (isNaN(finalPrice) || finalPrice <= 0) {
      setError('Invalid price amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const extensionData = {
        rental_id: rental.id,
        extension_hours: selectedHours,
        extension_price: finalPrice,
        requested_by: currentUser?.id,
        status: autoApprove ? 'approved' : 'pending',
        approved_by: autoApprove ? currentUser?.id : null,
        approved_at: autoApprove ? new Date().toISOString() : null,
        price_source: manualPriceOverride ? 'manual' : (priceCalculation.price_source || 'auto'),
        calculation_method: manualPriceOverride ? 'manual' : 'auto',
        tier_applied: priceCalculation.tier_applied || false,
        tier_id: priceCalculation.tier_id || null,
        notes: null
      };

      console.log('📝 Creating extension request:', extensionData);

      const { extension } = await ExtensionPricingService.createExtensionRequest(extensionData);

      console.log('✅ Extension request created:', extension);

      alert(autoApprove 
        ? '✅ Extension approved and rental updated!' 
        : '✅ Extension request submitted for approval!'
      );

      onExtensionCreated();
      onClose();
    } catch (err) {
      console.error('❌ Error creating extension request:', err);
      setError(`Failed to create extension request: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleCustomPriceChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomPrice(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Clock className="w-5 h-5 text-purple-600" />
            Request Extension
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hours Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Extension Duration
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {hourOptions.map((hours) => (
                <button
                  key={hours}
                  onClick={() => setSelectedHours(hours)}
                  className={`
                    py-2 px-3 rounded-lg border-2 font-medium text-sm transition-all
                    ${selectedHours === hours
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                    }
                  `}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>

          {/* Manual Price Override */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manualPriceOverride}
                onChange={(e) => setManualPriceOverride(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Custom Extension Fee</span>
            </label>
          </div>

          {manualPriceOverride && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                You are manually overriding the calculated price. The custom amount will be used instead of the automatic calculation.
              </AlertDescription>
            </Alert>
          )}

          {/* Price Display */}
          {isCalculating ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : priceCalculation && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Extension Duration:</span>
                <span className="font-semibold text-gray-900">{selectedHours} hour{selectedHours > 1 ? 's' : ''}</span>
              </div>

              {manualPriceOverride ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Custom Extension Fee (MAD)
                  </label>
                  <input
                    type="text"
                    value={customPrice}
                    onChange={handleCustomPriceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter custom amount"
                  />
                </div>
              ) : (
                <>
                  {priceCalculation.tierBreakdown && priceCalculation.tierBreakdown.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-xs font-medium text-gray-600">Price Breakdown:</p>
                      {priceCalculation.tierBreakdown.map((tier, index) => (
                        <div key={index} className="flex justify-between text-xs text-gray-600">
                          <span>{tier.hours}h @ {tier.rate} MAD/h {tier.discount > 0 && `(-${tier.discount}%)`}</span>
                          <span>{formatCurrency(tier.subtotal)} MAD</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {priceCalculation.totalSavings > 0 && (
                    <div className="flex items-center justify-between text-sm text-green-600">
                      <span>You Save:</span>
                      <span className="font-semibold">{formatCurrency(priceCalculation.totalSavings)} MAD</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300">
                <span className="text-base font-semibold text-gray-900">Total Extension Fee:</span>
                <span className="text-xl font-bold text-purple-600">
                  {formatCurrency(manualPriceOverride ? parseFloat(customPrice || 0) : (priceCalculation.extension_price || priceCalculation.totalPrice || 0))} MAD
                </span>
              </div>

              <div className="text-xs text-gray-500 pt-2">
                <p>New end date: {new Date(priceCalculation.newEndDate).toLocaleString()}</p>
              </div>
            </div>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>

            {isAdmin ? (
              <Button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting || isCalculating || !priceCalculation}
                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Extend Immediately
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting || isCalculating || !priceCalculation}
                className="w-full sm:flex-1 bg-purple-600 hover:bg-purple-700 text-white order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}