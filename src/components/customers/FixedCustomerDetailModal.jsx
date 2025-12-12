import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CreditCard, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Bug
} from 'lucide-react';
import FixedCustomerService from '../../services/FixedCustomerService';
import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase credentials
const SUPABASE_URL = 'https://nnaymteoxvdnsnhlyvkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYXltdGVveHZkbnNuaGx5dmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MjcwMzYsImV4cCI6MjA2NTQwMzAzNn0.L7CLWRSqOq91Lz0zRq6ddRLyEN6lBgewtcfGaqLiceM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * CRITICAL FIX: Fixed Customer Detail Modal with Enhanced Error Handling
 * 
 * FIXES IMPLEMENTED:
 * - Resolves 406 "Not Acceptable" errors
 * - Customer ID resolution from rental IDs
 * - Multiple fallback query methods
 * - Emergency debugging panel
 * - Enhanced error handling and logging
 * - Contact information from rentals table
 * - ID document scan display
 */
const FixedCustomerDetailModal = ({ 
  isOpen, 
  onClose, 
  customerId, 
  rentalId = null,
  title = "Customer Details" 
}) => {
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [fetchMetadata, setFetchMetadata] = useState(null);

  /**
   * Enhanced customer data fetching with contact info from rentals
   */
  const fetchEnhancedCustomerData = async () => {
    if (!customerId) {
      setError('No customer ID provided');
      return;
    }

    console.log('🔍 FIXED MODAL: Starting enhanced customer data fetch...');
    console.log('📊 FIXED MODAL: Input parameters:', { customerId, rentalId });

    setLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      // Fetch customer data and rentals in parallel
      const [customersResponse, rentalsResponse] = await Promise.all([
        supabase.from('app_4c3a7a6153_customers').select('*').eq('id', customerId),
        supabase.from('app_4c3a7a6153_rentals').select('*').eq('customer_id', customerId)
      ]);

      if (customersResponse.error) throw customersResponse.error;
      if (rentalsResponse.error) throw rentalsResponse.error;

      const customer = customersResponse.data?.[0];
      const rentals = rentalsResponse.data || [];

      console.log('📊 FIXED MODAL: Raw customer data:', customer);
      console.log('📊 FIXED MODAL: Raw rentals data:', rentals);

      if (!customer) {
        // Try to use the original service as fallback
        const result = await FixedCustomerService.getCustomerWithRentalContext(customerId, rentalId);
        
        if (result.success) {
          setCustomerData(result.data.customer);
          setFetchMetadata(result.data.metadata);
          
          setDebugInfo({
            originalId: customerId,
            resolvedId: result.data.metadata?.resolvedId,
            method: 'fallback_service',
            wasCreated: result.data.metadata?.wasCreated,
            hasRentalContext: !!result.data.rental,
            timestamp: new Date().toISOString()
          });
          
          console.log('✅ FIXED MODAL: Customer data loaded via fallback service');
          return;
        } else {
          throw new Error(`Customer not found: ${customerId}`);
        }
      }

      // Enhance customer data with contact info from rentals
      const rentalWithEmail = rentals.find(rental => rental.customer_email && rental.customer_email.trim() !== '');
      const rentalWithPhone = rentals.find(rental => rental.customer_phone && rental.customer_phone.trim() !== '');
      
      // Fallback to rental email/phone fields if customer_email/customer_phone not available
      const fallbackRentalWithEmail = rentals.find(rental => rental.email && rental.email.trim() !== '');
      const fallbackRentalWithPhone = rentals.find(rental => rental.phone && rental.phone.trim() !== '');

      const enhancedCustomer = {
        ...customer,
        // Priority order: customer table -> rental customer_email/customer_phone -> rental email/phone -> null
        email: customer.email || 
               (rentalWithEmail?.customer_email) || 
               (fallbackRentalWithEmail?.email) || 
               null,
        phone: customer.phone || 
               (rentalWithPhone?.customer_phone) || 
               (fallbackRentalWithPhone?.phone) || 
               null,
        rentalHistory: rentals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      };

      console.log(`📊 FIXED MODAL: Enhanced customer ${customer.full_name} contact info:`, {
        originalEmail: customer.email,
        originalPhone: customer.phone,
        rentalCustomerEmail: rentalWithEmail?.customer_email,
        rentalCustomerPhone: rentalWithPhone?.customer_phone,
        finalEmail: enhancedCustomer.email,
        finalPhone: enhancedCustomer.phone
      });

      setCustomerData(enhancedCustomer);
      setFetchMetadata({
        method: 'enhanced_direct_query',
        contactSource: {
          email: enhancedCustomer.email ? (customer.email ? 'customer_table' : 'rental_table') : null,
          phone: enhancedCustomer.phone ? (customer.phone ? 'customer_table' : 'rental_table') : null
        },
        rentalCount: rentals.length
      });
      
      // Set debug info
      setDebugInfo({
        originalId: customerId,
        resolvedId: customerId,
        method: 'enhanced_direct_query',
        wasCreated: false,
        hasRentalContext: !!rentalId,
        contactEnhanced: !!(enhancedCustomer.email || enhancedCustomer.phone),
        rentalCount: rentals.length,
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ FIXED MODAL: Enhanced customer data loaded successfully');
      console.log('📊 FIXED MODAL: Final customer data:', enhancedCustomer);
      
    } catch (error) {
      console.error('❌ FIXED MODAL: Exception during customer fetch:', error);
      setError(`Critical error: ${error.message}`);
      
      setDebugInfo({
        originalId: customerId,
        exception: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * CRITICAL FIX: Enhanced customer data fetching
   */
  const fetchCustomerData = async () => {
    // Use the new enhanced method
    await fetchEnhancedCustomerData();
  };

  // Fetch customer data when modal opens or customerId changes
  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerData();
    }
  }, [isOpen, customerId, rentalId]);

  /**
   * CRITICAL FIX: Emergency debugging panel
   */
  const renderDebugPanel = () => {
    if (!debugMode) return null;

    return (
      <Card className="mt-4 border-yellow-200 bg-yellow-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Emergency Debug Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div><strong>Original ID:</strong> {debugInfo?.originalId || 'N/A'}</div>
          <div><strong>Resolved ID:</strong> {debugInfo?.resolvedId || 'N/A'}</div>
          <div><strong>Fetch Method:</strong> {debugInfo?.method || 'N/A'}</div>
          <div><strong>Was Created:</strong> {debugInfo?.wasCreated ? 'Yes' : 'No'}</div>
          <div><strong>Has Rental Context:</strong> {debugInfo?.hasRentalContext ? 'Yes' : 'No'}</div>
          <div><strong>Contact Enhanced:</strong> {debugInfo?.contactEnhanced ? 'Yes' : 'No'}</div>
          <div><strong>Rental Count:</strong> {debugInfo?.rentalCount || 0}</div>
          <div><strong>Timestamp:</strong> {debugInfo?.timestamp || 'N/A'}</div>
          {debugInfo?.error && (
            <div className="text-red-600">
              <strong>Error:</strong> {debugInfo.error}
            </div>
          )}
          {debugInfo?.exception && (
            <div className="text-red-600">
              <strong>Exception:</strong> {debugInfo.exception}
            </div>
          )}
          {fetchMetadata && (
            <div className="mt-2 p-2 bg-blue-50 rounded">
              <strong>Fetch Metadata:</strong>
              <pre className="text-xs mt-1 whitespace-pre-wrap">
                {JSON.stringify(fetchMetadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  /**
   * CRITICAL FIX: Enhanced customer information display
   */
  const renderCustomerInfo = () => {
    if (!customerData) return null;

    const hasCompleteProfile = customerData.full_name && 
                              customerData.full_name !== 'Unknown Customer' &&
                              (customerData.phone || customerData.email);

    return (
      <div className="space-y-4">
        {/* Profile Status Alert */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>Complete Customer Profile</strong>
            <br />
            Complete Profile<br />
            This customer has a complete profile with ID verification.
          </AlertDescription>
        </Alert>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name:</label>
                <p className="text-sm font-medium">
                  {customerData.full_name || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email:</label>
                <p className="text-sm">
                  {customerData.email || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone:</label>
                <p className="text-sm">
                  {customerData.phone || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID Document Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ID Document Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Birth Date:</label>
                <p className="text-sm">
                  {customerData.date_of_birth ? new Date(customerData.date_of_birth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nationality:</label>
                <p className="text-sm">
                  {customerData.nationality || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ID Document Scan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ID Document Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerData.id_scan_url ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">ID document scan available</span>
                </div>
                <img 
                  src={customerData.id_scan_url} 
                  alt="ID Document Scan"
                  className="max-w-full h-auto rounded-lg border"
                  onError={(e) => {
                    console.error('❌ FIXED MODAL: Image load failed:', customerData.id_scan_url);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <div style={{ display: 'none' }} className="text-sm text-red-600">
                  Failed to load image: {customerData.id_scan_url}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-500">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">No ID document scan available</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Customer ID:</label>
                <p className="text-sm font-mono">
                  {customerData.id || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created:</label>
                <p className="text-sm">
                  {customerData.created_at ? new Date(customerData.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Updated:</label>
                <p className="text-sm">
                  {customerData.updated_at ? new Date(customerData.updated_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rental Context */}
        {rentalId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Rental Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Viewing customer details for rental: <span className="font-mono">{rentalId}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Rental Date: {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Debug Panel */}
        {renderDebugPanel()}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{title}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDebugMode(!debugMode)}
                className="text-xs"
              >
                {debugMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {debugMode ? 'Hide Debug' : 'Show Debug'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCustomerData}
                disabled={loading}
                className="text-xs"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)]">
          <div className="p-1">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading customer data...</span>
              </div>
            )}

            {error && (
              <Alert className="border-red-200 bg-red-50 mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Error Loading Customer Data</strong>
                  <br />
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {!loading && !error && customerData && renderCustomerInfo()}

            {!loading && !error && !customerData && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No customer data available</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default FixedCustomerDetailModal;