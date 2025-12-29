/**
 * RENTAL EXTENSION INTEGRATION PATCH
 * Instructions: Add these imports, state variables, and functions to RentalDetails.jsx
 * 
 * This file contains all the code snippets needed to integrate rental extension functionality
 */

// ==================== STEP 1: ADD IMPORTS (after line 45) ====================
import ExtensionPricingService from '../../services/ExtensionPricingService';
import ExtensionRequestModal from '../../components/admin/ExtensionRequestModal';
import ExtensionHistory from '../../components/admin/ExtensionHistory';

// ==================== STEP 2: ADD STATE VARIABLES (after line 95) ====================
// Extension state
const [extensionModalOpen, setExtensionModalOpen] = useState(false);
const [extensions, setExtensions] = useState([]);
const [loadingExtensions, setLoadingExtensions] = useState(false);

// ==================== STEP 3: ADD LOAD EXTENSIONS FUNCTION (after line 392) ====================
// Load extensions for this rental
const loadExtensions = async () => {
  if (!id) return;
  
  setLoadingExtensions(true);
  try {
    const { extensions: extensionData } = await ExtensionPricingService.getExtensionsByRental(id);
    setExtensions(extensionData || []);
    console.log('✅ Extensions loaded:', extensionData?.length || 0);
  } catch (err) {
    console.error('❌ Error loading extensions:', err);
  } finally {
    setLoadingExtensions(false);
  }
};

// ==================== STEP 4: ADD EXTENSION HANDLERS (after line 888) ====================
// Handle extension request creation
const handleExtensionCreated = async () => {
  console.log('🔄 Extension created, reloading data...');
  
  // Reload rental data
  try {
    const { data, error } = await supabase
      .from('app_4c3a7a6153_rentals')
      .select(`
        *,
        vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    setRental(data);
  } catch (err) {
    console.error('❌ Error reloading rental:', err);
  }
  
  // Reload extensions
  await loadExtensions();
};

// Handle extension approval
const handleApproveExtension = async (extensionId) => {
  if (!confirm('Approve this extension request?')) return;
  
  try {
    await ExtensionPricingService.approveExtension(extensionId, currentUser?.id);
    alert('✅ Extension approved successfully!');
    await handleExtensionCreated();
  } catch (err) {
    console.error('❌ Error approving extension:', err);
    alert(`Failed to approve extension: ${err.message}`);
  }
};

// Handle extension rejection
const handleRejectExtension = async (extensionId) => {
  const reason = prompt('Enter rejection reason (optional):');
  if (reason === null) return; // User cancelled
  
  try {
    await ExtensionPricingService.rejectExtension(extensionId, reason);
    alert('✅ Extension rejected.');
    await loadExtensions();
  } catch (err) {
    console.error('❌ Error rejecting extension:', err);
    alert(`Failed to reject extension: ${err.message}`);
  }
};

// ==================== STEP 5: ADD USEEFFECT FOR LOADING EXTENSIONS (after line 392) ====================
// Load extensions when rental is loaded
useEffect(() => {
  if (rental?.id) {
    loadExtensions();
  }
}, [rental?.id]);

// ==================== STEP 6: ADD EXTENSION BUTTON (in the header section, around line 936) ====================
// Add this button next to other action buttons in the header
{isActive && (
  <Button 
    onClick={() => setExtensionModalOpen(true)}
    className="bg-purple-600 hover:bg-purple-700 text-white"
  >
    <Clock className="w-4 h-4 mr-2" />
    Request Extension
  </Button>
)}

// ==================== STEP 7: ADD EXTENSION HISTORY SECTION (after line 1061, before the "Rental Information" card) ====================
{/* Extension History Section */}
{extensions.length > 0 && (
  <div className="mb-6">
    <ExtensionHistory 
      extensions={extensions}
      onApprove={handleApproveExtension}
      onReject={handleRejectExtension}
      isAdmin={isAdmin}
    />
  </div>
)}

// ==================== STEP 8: ADD EXTENSION MODAL (before the closing </div>, around line 1423) ====================
{/* Extension Request Modal */}
<ExtensionRequestModal
  isOpen={extensionModalOpen}
  onClose={() => setExtensionModalOpen(false)}
  rental={rental}
  onExtensionCreated={handleExtensionCreated}
  currentUser={currentUser}
/>

// ==================== STEP 9: ADD EXTENSION INFO TO RENTAL INFORMATION CARD (around line 1272) ====================
// Add this section after the "Contract Signed" line
{rental.extension_count > 0 && (
  <>
    <Separator />
    <div>
      <h3 className="font-semibold mb-3 text-lg">Extension Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm sm:text-base">
        <p><strong>Total Extensions:</strong> {rental.extension_count}</p>
        <p><strong>Extended Hours:</strong> {rental.total_extended_hours || 0}h</p>
        <p><strong>Extension Fees:</strong> {formatCurrency(rental.total_extension_price || 0)}</p>
        {rental.original_end_date && (
          <p><strong>Original End Date:</strong> {new Date(rental.original_end_date).toLocaleString()}</p>
        )}
      </div>
    </div>
  </>
)}

// ==================== STEP 10: UPDATE FINANCIAL INFORMATION DISPLAY ====================
// Modify the financial section to show extension fees (around line 1250)
<div className="space-y-2 text-sm">
  <div className="flex justify-between">
    <span className="text-gray-600">Base Rental Amount:</span>
    <span className="font-medium">{formatCurrency(rental.total_amount)}</span>
  </div>
  {rental.total_extension_price > 0 && (
    <div className="flex justify-between text-purple-600">
      <span className="font-medium">Extension Fees ({rental.total_extended_hours}h):</span>
      <span className="font-bold">+{formatCurrency(rental.total_extension_price)}</span>
    </div>
  )}
  <div className="flex justify-between pt-2 border-t-2 border-gray-300 text-lg">
    <span className="font-bold text-gray-900">Grand Total:</span>
    <span className="font-bold text-green-600">
      {formatCurrency((rental.total_amount || 0) + (rental.total_extension_price || 0))}
    </span>
  </div>
  <div className="flex justify-between">
    <span className="text-gray-600">Deposit Amount:</span>
    <span className="font-medium">{rental.deposit_amount || 0} MAD</span>
  </div>
  <div className="flex justify-between font-bold text-red-600">
    <span>Remaining Due:</span>
    <span>{rental.remaining_amount || 0} MAD</span>
  </div>
  <div className="flex justify-between">
    <span className="text-gray-600">Damage Deposit:</span>
    <span className="font-medium">{rental.damage_deposit || 0} MAD</span>
  </div>
</div>

/**
 * INTEGRATION CHECKLIST:
 * 
 * □ Step 1: Add imports at the top of RentalDetails.jsx
 * □ Step 2: Add state variables in the component
 * □ Step 3: Add loadExtensions function
 * □ Step 4: Add extension handler functions
 * □ Step 5: Add useEffect for loading extensions
 * □ Step 6: Add "Request Extension" button in header (for active rentals)
 * □ Step 7: Add ExtensionHistory component in the render section
 * □ Step 8: Add ExtensionRequestModal at the end of the component
 * □ Step 9: Add extension info display in Rental Information card
 * □ Step 10: Update financial information to show extension fees
 * 
 * TESTING:
 * 1. Navigate to an active rental
 * 2. Click "Request Extension" button
 * 3. Select hours and review pricing
 * 4. Submit extension request
 * 5. Verify extension appears in history
 * 6. As admin, approve/reject extension
 * 7. Verify rental end date updates after approval
 * 8. Verify financial totals include extension fees
 */