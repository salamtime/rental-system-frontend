import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { generateThumbnailFromBlob, uploadThumbnail } from '../../utils/thumbnailGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
import RentalVideos from '../../components/RentalVideos';
import ViewCustomerDetailsDrawer from '../../components/admin/ViewCustomerDetailsDrawer';
import { useTimer } from '../../hooks/useTimer';
import RentalContract from '../../components/admin/RentalContract';
import SignaturePadModal from '../../components/SignaturePadModal';
import SecondDriverDetailsModal from '../../components/admin/SecondDriverDetailsModal';
import ExtensionRequestModal from '../../components/admin/ExtensionRequestModal';
import ExtensionHistory from '../../components/admin/ExtensionHistory';
import ExtensionPricingService from '../../services/ExtensionPricingService';
import { useReactToPrint } from 'react-to-print';
import OverageCalculationService from '../../services/OverageCalculationService';
import { getPaymentStatusStyle } from '../../config/statusColors';
import { isAdminOrOwner, canApprovePriceOverrides } from '../../utils/permissionHelpers';
import PricingRulesService from '../../services/PricingRulesService';
import { ArrowLeft, Printer, X, Upload, Play, Plus, AlertTriangle, Clock, CheckCircle, XCircle, Calendar, PlayCircle, Maximize2, User, Users, CreditCard, FileSignature, Edit, Save, DollarSign, StopCircle, Video, FileVideo, Camera, Flashlight, Info, Gauge, Package, FileText, Receipt, Share2, Smartphone } from 'lucide-react';
import { FaWhatsapp, FaCheck, FaFilePdf, FaFileInvoice, FaVideo } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoiceTemplate from '../../components/InvoiceTemplate';
import ContractTemplate from '../../components/ContractTemplate';
import ReceiptTemplate from '../../components/ReceiptTemplate';
import { processVideo } from '../../utils/videoConverter';

export default function RentalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [elapsedTime, setElapsedTime] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  
  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  const [secondDriverModalOpen, setSecondDriverModalOpen] = useState(false);
  
  const [capturedFiles, setCapturedFiles] = useState([]);
  
  const [openingMedia, setOpeningMedia] = useState([]);
  const [closingMedia, setClosingMedia] = useState([]);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  
  const [isSigning, setIsSigning] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const forceMobileRender = async () => {
    if (!isMobileDevice()) return;
    
    // Force React to re-render hidden templates
    await new Promise(resolve => {
      setVideoRefreshKey(prev => prev + 1);
      setTimeout(resolve, 500);
    });
  };


  const [contractPreviewModal, setContractPreviewModal] = useState(false);
  const [receiptPreviewModal, setReceiptPreviewModal] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [isGeneratingBoth, setIsGeneratingBoth] = useState(false);

  // WhatsApp modal state
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappOptions, setWhatsappOptions] = useState({
    contract: true,
    receipt: true,
    openingVideo: false,
    closingVideo: false
  });

  const [logoUrl, setLogoUrl] = useState(null);
  const [stampUrl, setStampUrl] = useState(null);

  // Price editing state
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [priceOverrideReason, setPriceOverrideReason] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Video refresh trigger
  const [videoRefreshKey, setVideoRefreshKey] = useState(0);
  const [mobileLoading, setMobileLoading] = useState(false);

  // Extension state
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensions, setExtensions] = useState([]);
  const [loadingExtensions, setLoadingExtensions] = useState(false);

  // Late fee state
  const [lateFee, setLateFee] = useState(null);

  // Deposit return state
  const [showDepositSignatureModal, setShowDepositSignatureModal] = useState(false);
  const [deductFromDeposit, setDeductFromDeposit] = useState(false);
  const [depositReturnAmount, setDepositReturnAmount] = useState(0);

  // Odometer state
  const [startOdometer, setStartOdometer] = useState('');
  const [isEditingOdometer, setIsEditingOdometer] = useState(false);
  const [isSavingOdometer, setIsSavingOdometer] = useState(false);
  const [endOdometer, setEndOdometer] = useState('');
  const [showEndOdometerPrompt, setShowEndOdometerPrompt] = useState(false);
  const [isProcessingEndOdometer, setIsProcessingEndOdometer] = useState(false);

  const [customerDetailsDrawer, setCustomerDetailsDrawer] = useState({
    isOpen: false,
    customerId: null,
    rental: null
  });

  // Camera recording state - NEW for native camera support
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // Default to back camera
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isProcessingThumbnail, setIsProcessingThumbnail] = useState(false); // 'environment' = back, 'user' = front
  const [recordingStream, setRecordingStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const videoPreviewRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Video conversion state - for iOS .MOV/HEVC to mp4 conversion
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  



  const contractRef = useRef();
  const invoiceRef = useRef();
  const contractTemplateRef = useRef();
  const receiptTemplateRef = useRef();
  
  const handlePrintContract = useReactToPrint({
    content: () => contractRef.current,
    documentTitle: `Rental-Contract-${rental?.id}`,
  });

  const handlePrintInvoice = () => {
    if (!rental?.id) return alert("Rental ID missing");
    window.open(`/invoice/${rental.id}`, "_blank");
  };

  const toDataURL = (url) =>
    fetch(url)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      );

  useEffect(() => {
    toDataURL("/assets/logo.jpg").then((dataUrl) => {
      setLogoUrl(dataUrl);
    });
    toDataURL("/assets/stamp.png").then((dataUrl) => {
      setStampUrl(dataUrl);
    });
  }, []);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: userProfile, error } = await supabase
            .from('app_b30c02e74da644baad4668e3587d86b1_users')
            .select('role, full_name')
            .eq('id', user.id)
            .single();
          
          if (!error && userProfile) {
            setCurrentUser({ ...user, role: userProfile.role, full_name: userProfile.full_name });
          } else {
            setCurrentUser(user);
          }
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    getCurrentUser();
  }, []);

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

  // Load rental data and fetch vehicle's current odometer - UPDATED to include package
  const loadRentalData = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*),
          package:rental_packages(*),
          extensions:rental_extensions!rental_extensions_rental_id_fkey(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      let rentalData = data;


      setRental(rentalData);
      
      // Pre-populate odometer from rental's start_odometer or vehicle's current_odometer
      if (rentalData.start_odometer) {
        setStartOdometer(rentalData.start_odometer.toString());
      } else if (rentalData.vehicle?.current_odometer) {
        setStartOdometer(rentalData.vehicle.current_odometer.toString());
      } else {
        setStartOdometer('');
      }
      
      await loadRentalMedia(rentalData.id);
      
    } catch (err) {
      console.error('❌ Error loading rental:', err);
      setError('Failed to load rental details');
    }
  };

  // Load extensions when rental is loaded
  useEffect(() => {
    if (rental?.id) {
      loadExtensions();
    }
  }, [rental?.id]);


  // ✅ MEMOIZED: Calculate extension totals to prevent unnecessary recalculations
  const totalExtensionFees = useMemo(() => {
    if (!rental?.extensions || rental.extensions.length === 0) return 0;
    
    const approvedExtensions = rental.extensions.filter(ext => ext.status === "approved");
    const total = approvedExtensions.reduce((sum, ext) => sum + (parseFloat(ext.extension_price) || 0), 0);
    
    console.log("📊 Extension Fees Calculation:", {
      totalExtensions: rental.extensions.length,
      approvedCount: approvedExtensions.length,
      breakdown: approvedExtensions.map(ext => ({
        hours: ext.extension_hours,
        price: ext.extension_price
      })),
      totalFees: total
    });
    
    return total;
  }, [rental?.extensions]);

  const totalExtendedHours = useMemo(() => {
    if (!rental?.extensions || rental.extensions.length === 0) return 0;
    
    const approvedExtensions = rental.extensions.filter(ext => ext.status === "approved");
    return approvedExtensions.reduce((sum, ext) => sum + (parseFloat(ext.extension_hours) || 0), 0);
  }, [rental?.extensions]);
  // Calculate late fee for completed rentals
  useEffect(() => {
    const calculateLateFee = async () => {
      if (rental?.rental_status === 'completed') {
        try {
          const { data, error } = await supabase.rpc(
            'calculate_late_fee',
            { p_rental_id: rental.id }
          );
          
          if (!error && data?.is_late) {
            setLateFee(data);
          }
        } catch (error) {
          console.error('Error calculating late fee:', error);
        }
      }
    };
    
    calculateLateFee();
  }, [rental]);

  // Generate and send invoice
  const handleGenerateInvoice = async () => {
    if (!rental?.customer_phone) {
      alert("Customer phone number is not available.");
      return;
    }

    setIsSharing(true);
    try {
      const invoiceElement = invoiceRef.current;
      if (!invoiceElement) {
        throw new Error("Invoice template could not be found.");
      }

      const canvas = await html2canvas(invoiceElement, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');

      const filePath = `invoices/${rental.id}_${Date.now()}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`PDF Upload Error: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('invoices')
        .getPublicUrl(uploadData.path);
        
      const invoiceUrl = publicUrlData.publicUrl;

      let videoUrl = 'Not available';
      const allMedia = [...openingMedia, ...closingMedia].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (allMedia.length > 0 && allMedia[0].public_url) {
        videoUrl = allMedia[0].public_url;
      }

      const message = `Hi ${rental.customer_name}!\n\nYour rental documents:\nInvoice: ${invoiceUrl}\nVideo: ${videoUrl}\n\nThank you!`;
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${rental.customer_phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;

      window.location.href = whatsappUrl;

    } catch (err) {
      console.error('❌ Error:', err);
      alert(`Failed to share via WhatsApp. Error: ${err.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  // Generate Contract PDF
  const generateContractPDF = async () => {
    try {
    const scale = 2;
      setIsGeneratingContract(true);
      const canvas = await html2canvas(contractTemplateRef.current, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const fileName = `contract_${rental.id}_${Date.now()}.pdf`;
      const filePath = `contracts/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rental-documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('rental-documents')
        .getPublicUrl(filePath);

      setIsGeneratingContract(false);
      return publicUrl;
    } catch (error) {
      console.error('Error generating contract PDF:', error);
      setIsGeneratingContract(false);
      throw error;
    }
  };

  // Generate Receipt PDF
  const generateReceiptPDF = async () => {
    const scale = 2;
    try {
      setIsGeneratingReceipt(true);
      const canvas = await html2canvas(receiptTemplateRef.current, {
        scale: scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let imgData = canvas.toDataURL('image/png');

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const fileName = `receipt_${rental.id}_${Date.now()}.pdf`;
      const filePath = `receipts/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rental-documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('rental-documents')
        .getPublicUrl(filePath);

      setIsGeneratingContract(false);
      return publicUrl;
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      setIsGeneratingReceipt(false);
      throw error;
    }
  };

  // Send Contract Only via WhatsApp
  const sendContractOnly = async () => {
    if (!rental?.customer_phone) {
      alert("Customer phone number is not available.");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const contractUrl = await generateContractPDF();
      
      const message = `Hi ${rental.customer_name}!\n\nYour signed rental contract:\n${contractUrl}\n\nKeep for your records.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${rental.customer_phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
      
      window.location.href = whatsappUrl;
    } catch (error) {
      console.error('Error sending contract:', error);
      alert('Failed to send contract. Please try again.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Send Receipt Only via WhatsApp
  const sendReceiptOnly = async () => {
    if (!rental?.customer_phone) {
      alert("Customer phone number is not available.");
      return;
    }

    setIsSendingWhatsApp(true);
    try {
      const receiptUrl = await generateReceiptPDF();
      
      const totalAmount = calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0);
      const status = rental.payment_status === 'paid' ? 'PAID IN FULL' : 'AMOUNT DUE';
      
      const message = `Hi ${rental.customer_name}!\n\nYour payment receipt:\n${receiptUrl}\n\nTotal: ${totalAmount.toFixed(2)} MAD\nStatus: ${status}`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${rental.customer_phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
      
      window.location.href = whatsappUrl;
    } catch (error) {
      console.error('Error sending receipt:', error);
      alert('Failed to send receipt. Please try again.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Send Both Documents via WhatsApp
  const sendBothDocuments = async () => {
    if (!rental?.customer_phone) {
      alert("Customer phone number is not available.");
      return;
    }

    setIsGeneratingBoth(true);
    setIsSendingWhatsApp(true);
    try {
      const contractUrl = await generateContractPDF();
      const receiptUrl = await generateReceiptPDF();
      
      const totalAmount = calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0);
      
      const message = `Hi ${rental.customer_name}!\n\nYour rental documents:\n\n1. Contract: ${contractUrl}\n2. Receipt: ${receiptUrl}\n\nTotal: ${totalAmount.toFixed(2)} MAD\nThank you!`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${rental.customer_phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
      
      window.location.href = whatsappUrl;
    } catch (error) {
      console.error('Error sending both documents:', error);
      alert('Failed to send documents. Please try again.');
    } finally {
      setIsGeneratingBoth(false);
      setIsSendingWhatsApp(false);
    }
  };


  // Handle extension request creation
  const handleExtensionCreated = async () => {
    console.log('🔄 Extension created, reloading data...');
    
    await loadRentalData();
    await loadExtensions();
    
    setTimeout(async () => {
      console.log('📄 Auto-generating updated invoice after extension...');
      try {
        await handleGenerateInvoice();
        console.log('✅ Invoice regenerated and sent after extension');
      } catch (error) {
        console.error('❌ Failed to regenerate invoice after extension:', error);
      }
    }, 2000);
  };

  // Handle extension approval
  const handleApproveExtension = async (extensionId) => {
    if (!confirm('Approve this extension request?')) return;
    
    try {
      const result = await ExtensionPricingService.approveExtension(extensionId, currentUser?.id);
      alert('✅ Extension approved successfully!');
      await handleExtensionCreated();
    } catch (err) {
      console.error('❌ Error approving extension:', err);
      alert(`Failed to approve extension: ${err.message}`);
    }
  };

  // Handle extension rejection
  const handleRejectExtension = async (extensionId) => {
    if (!confirm('Cancel this extension request?')) return;
    
    try {
      await ExtensionPricingService.rejectExtension(extensionId, currentUser?.id, null);
      alert('✅ Extension request cancelled.');
      await loadExtensions();

  const handleSendWhatsAppSelection = async (options) => {
    setIsSharing(true);
    setWhatsappModalOpen(false);
    
    try {
      const itemsToSend = [];
      
      // Add contract if selected and available
      if (options.contract && rental.signature_url) {
        const contractPDF = await generateContractPDF();
        if (contractPDF) itemsToSend.push('Contract');
      }
      
      // Add receipt if selected and payment is completed
      if (options.receipt && rental.payment_status === 'paid') {
        const receiptPDF = await generateReceiptPDF();
        if (receiptPDF) itemsToSend.push('Receipt');
      }
      
      // Add opening video if selected
      if (options.openingVideo && openingMedia.length > 0) {
        itemsToSend.push(`Opening Video (${openingMedia.length} file${openingMedia.length > 1 ? 's' : ''})`);
      }
      
      // Add closing video if selected
      if (options.closingVideo && closingMedia.length > 0) {
        itemsToSend.push(`Closing Video (${closingMedia.length} file${closingMedia.length > 1 ? 's' : ''})`);
      }
      
      if (itemsToSend.length === 0) {
        alert('No items selected to send');
        return;
      }
      
      // Build WhatsApp message
      const formatRentalId = (rental) => {
        return rental.id ? `#${rental.id.toString().padStart(4, '0')}` : 'N/A';
      };
      
      let message = `Hello ${rental.customer_name},\n\nHere are your rental documents:\n\n`;
      message += itemsToSend.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
      message += `\n\nRental ID: ${formatRentalId(rental)}`;
      
      // Add video URLs if selected
      if (options.openingVideo && openingMedia.length > 0) {
        message += `\n\nOpening Video: ${openingMedia[0].public_url || openingMedia[0].url}`;
      }
      if (options.closingVideo && closingMedia.length > 0) {
        message += `\n\nClosing Video: ${closingMedia[0].public_url || closingMedia[0].url}`;
      }
      
      const whatsappUrl = `https://wa.me/${rental.customer_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Reset options to defaults
      setWhatsappOptions({
        contract: true,
        receipt: true,
        openingVideo: false,
        closingVideo: false
      });
      
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Failed to prepare WhatsApp message');
    } finally {
      setIsSharing(false);
    }
  };
    } catch (err) {
      console.error('❌ Error rejecting extension:', err);
      alert(`Failed to cancel extension: ${err.message}`);
    }
  };

  const handleShareViaWhatsApp = async () => {
    await handleGenerateInvoice();
  };

  const isPaymentSufficient = () => {
    const status = rental?.payment_status?.toLowerCase();
    return status === 'paid';
  };

    // ✅ UPDATED: Calculate deposit return amount with toggle support
  const calculateDepositReturn = () => {
    const damageDeposit = parseFloat(rental?.damage_deposit || 0);
    // Calculate actual grand total including overage and extensions
    const baseAmount = calculateRentalBaseAmount();
    const overageCharge = parseFloat(rental?.overage_charge || 0);
    const extensionFees = parseFloat(totalExtensionFees || 0);
    const totalRentalCost = baseAmount + overageCharge + extensionFees;
    const depositPaid = parseFloat(rental?.deposit_amount || 0);
    const balanceDue = Math.max(0, totalRentalCost - depositPaid);
    
    // Apply deduction if toggle is ON and not yet processed
    const useDeduction = deductFromDeposit && balanceDue > 0 && !rental.deposit_returned_at;
    const depositReturn = useDeduction 
      ? Math.max(0, damageDeposit - balanceDue)
      : damageDeposit;
    const additionalOwed = Math.max(0, balanceDue - damageDeposit);
    
    return {
      damageDeposit,
      totalRentalCost,
      balanceDue,
      depositReturn,
      hasDeduction: balanceDue > 0,
      additionalOwed,
      useDeduction
    };
  };

  // Fix for mobile blank screen - initialize mobile templates
  useEffect(() => {
    const initializeMobile = async () => {
      if (isMobileDevice() && rental) {
        setMobileLoading(true);
        // Force initial render of templates
        await new Promise(resolve => setTimeout(resolve, 1000));
        setVideoRefreshKey(prev => prev + 1);
        setMobileLoading(false);
      }
    };

    if (rental) {
      initializeMobile();
    }
  }, [rental]);

  const getPaymentStatusBadge = (paymentStatus) => {
    const { label, background, text } = getPaymentStatusStyle(paymentStatus);
    const colorClass = `${background} ${text}`;


    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {label}
      </span>
    );
  };

  const markAsPaid = async () => {
    if (isUpdatingPayment) return;
    
    try {
      setIsUpdatingPayment(true);
      
      // Calculate the complete total amount including all charges
      const baseAmount = calculateRentalBaseAmount();
      const overageCharge = parseFloat(rental.overage_charge || 0);
      const extensionFees = parseFloat(totalExtensionFees || 0);
      const grandTotal = baseAmount + overageCharge + extensionFees;
      
      // Update database: Set deposit_amount = grand total, remaining_amount = 0, status = paid
      const { error: updateError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          payment_status: 'paid',
          deposit_amount: grandTotal,
          remaining_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id);
      
      if (updateError) {
        console.error('❌ Direct update failed:', updateError);
        throw updateError;
      }

      // Update local state to reflect changes immediately
      setRental(prev => ({
        ...prev,
        payment_status: 'paid',
        deposit_amount: grandTotal,
        remaining_amount: 0
      }));

      alert(`✅ Payment status updated to "Paid"!\n\nGrand Total: ${grandTotal.toFixed(2)} MAD\nDeposit Paid: ${grandTotal.toFixed(2)} MAD\nBalance Due: 0.00 MAD`);
      
    } catch (err) {
      console.error('❌ Payment Update Error:', err);
      alert('⚠️ Unable to update payment status.');
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleSignatureSave = async (signatureUrl) => {
    if (!rental) return;
    setIsSigning(false);
    try {
      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({ 
            contract_signed: true, 
            signature_url: signatureUrl,
            updated_at: new Date().toISOString() 
        })
        .eq('id', rental.id)
        .select('*, vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*), package:rental_packages(*)')
        .single();
      if (error) throw error;
      setRental(data);
      alert('✅ Contract signed and signature saved!');
    } catch (err) {
      console.error('❌ Error:', err);
      alert(`Failed to save signature. Error: ${err.message}`);
    }
  };

    // ✅ UPDATED: Handle deposit return signature with toggle support
  const handleDepositSignatureSave = async (signatureUrl) => {
    try {
      const depositCalc = calculateDepositReturn();
      
      // ✅ NEW: Auto-update payment status to "paid" if balance was covered by deposit deduction
      const updateData = {
        deposit_return_signature_url: signatureUrl,
        deposit_returned_at: new Date().toISOString(),
        deposit_return_amount: depositCalc.depositReturn,
        deposit_deduction_amount: depositCalc.useDeduction ? depositCalc.balanceDue : 0,
        deposit_deduction_reason: depositCalc.useDeduction 
          ? `Unpaid rental balance: ${depositCalc.balanceDue.toFixed(2)} MAD` 
          : null,
        final_deposit_return_amount: depositCalc.depositReturn,
        updated_at: new Date().toISOString()
      };

      // ✅ If balance was deducted from deposit, mark rental as paid
      if (depositCalc.useDeduction && depositCalc.balanceDue > 0) {
        updateData.payment_status = 'paid';
        updateData.remaining_amount = 0;
      }
      
      const { error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update(updateData)
        .eq('id', rental.id);

      if (error) throw error;

      setShowDepositSignatureModal(false);
      setDeductFromDeposit(false); // Reset toggle
      await loadRentalData();
      
      const message = depositCalc.hasDeduction 
        ? `✅ Deposit return confirmed!\n\nAmount returned: ${depositCalc.depositReturn.toFixed(2)} MAD\nDeduction: ${depositCalc.balanceDue.toFixed(2)} MAD for unpaid balance\nPayment status updated to: Paid`
        : `✅ Deposit return confirmed! Amount returned: ${depositCalc.depositReturn.toFixed(2)} MAD`;
      
      alert(message);
    } catch (err) {
      console.error('Error saving deposit signature:', err);
      alert(`Failed to save deposit return signature. Error: ${err.message}`);
    }
  };

  // Handle odometer save
  const handleSaveOdometer = async () => {
    if (!startOdometer || parseFloat(startOdometer) <= 0) {
      alert('Please enter a valid odometer reading.');
      return;
    }

    setIsSavingOdometer(true);
    try {
      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          start_odometer: parseFloat(startOdometer),
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id)
        .select('*, vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*), package:rental_packages(*)')
        .single();

      if (error) throw error;

      setRental(data);
      setIsEditingOdometer(false);
      alert('✅ Odometer reading saved successfully!');
    } catch (err) {
      console.error('❌ Error saving odometer:', err);
      alert(`Failed to save odometer reading. Error: ${err.message}`);
    } finally {
      setIsSavingOdometer(false);
    }
  };

  const handleEndOdometerSubmit = async () => {
    if (!endOdometer || parseFloat(endOdometer) <= 0) {
      alert('Please enter a valid ending odometer reading.');
      return;
    }

    const endOdometerValue = parseFloat(endOdometer);
    const startOdometerValue = parseFloat(rental.start_odometer || 0);

    if (endOdometerValue < startOdometerValue) {
      alert(`❌ Invalid Odometer Reading\n\nEnding odometer (${endOdometerValue} km) cannot be less than starting odometer (${startOdometerValue} km).\n\nPlease enter a valid reading.`);
      return;
    }

    setIsProcessingEndOdometer(true);
    try {
      // ✅ CRITICAL: PRESERVE ORIGINAL PRICE - Don't call OverageCalculationService
      const totalDistance = endOdometerValue - startOdometerValue;
      
      // Calculate overage charge only
      let overageCharge = 0;
      let includedKilometers = 0;
      
      if (rental.package?.included_kilometers) {
        includedKilometers = parseFloat(rental.package.included_kilometers);
        if (totalDistance > includedKilometers) {
          const extraKms = totalDistance - includedKilometers;
          const extraKmRate = parseFloat(rental.package.extra_km_rate) || 1.5;
          overageCharge = extraKms * extraKmRate;
        }
      } else {
        // Default package if none assigned (100km included)
        includedKilometers = 100;
        if (totalDistance > includedKilometers) {
          const extraKms = totalDistance - includedKilometers;
          const extraKmRate = 1.5; // Default rate
          overageCharge = extraKms * extraKmRate;
        }
      }
      
      // ✅ PRESERVE ORIGINAL PRICE
      const originalPrice = rental.total_amount || rental.unit_price || 0;
      const extensionFees = totalExtensionFees || 0;
      const finalTotal = originalPrice + overageCharge + extensionFees;
      
      console.log('🔍 DEBUG - Price Preservation:', {
        originalPrice,
        overageCharge,
        extensionFees,
        finalTotal,
        totalDistance,
        includedKilometers
      });

      // Update rental with preserved price
      const { error: updateError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          ending_odometer: endOdometerValue,
          overage_charge: overageCharge,
          total_distance: totalDistance,
          // ✅ PRESERVE original total_amount
          total_amount: originalPrice,
          // Recalculate remaining amount
          remaining_amount: Math.max(0, finalTotal - (parseFloat(rental.deposit_amount) || 0)),
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id);

      if (updateError) throw updateError;

      // Update vehicle odometer
      if (rental.vehicle_id) {
        const { error: vehicleError } = await supabase
          .from('saharax_0u4w4d_vehicles')
          .update({ 
            current_odometer: endOdometerValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', rental.vehicle_id);

        if (vehicleError) {
          console.error('Failed to update vehicle odometer:', vehicleError);
        }
      }

      setShowEndOdometerPrompt(false);
      setEndOdometer('');
      
      // Update local state
      setRental(prev => ({
        ...prev,
        ending_odometer: endOdometerValue,
        overage_charge: overageCharge,
        total_distance: totalDistance,
        // Keep original price
        total_amount: originalPrice
      }));
      
      // Complete the rental
      const { error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({ 
          rental_status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', rental.id);

      if (error) throw error;
      
      if (rental.vehicle_id) {
        await supabase
          .from('saharax_0u4w4d_vehicles')
          .update({ status: 'available' })
          .eq('id', rental.vehicle_id);
      }

      await loadRentalData();
      
      alert(`✅ Rental completed successfully!\n\nDistance: ${totalDistance.toFixed(2)} km\nOverage: ${overageCharge.toFixed(2)} MAD\nOriginal Price: ${originalPrice.toFixed(2)} MAD\nTotal: ${finalTotal.toFixed(2)} MAD`);
      
      navigate('/admin/rentals');
      
    } catch (err) {
      console.error('❌ Error completing rental:', err);
      alert(`Failed to complete rental. Error: ${err.message}`);
    } finally {
      setIsProcessingEndOdometer(false);
    }
  };

  const loadRentalMedia = async (rentalId) => {
    try {
      const { data: mediaRecords, error: mediaError } = await supabase
        .from('app_2f7bf469b0_rental_media')
        .select('*')
        .eq('rental_id', rentalId)
        .ilike('file_type', 'video%')
        .order('created_at', { ascending: false });

      if (mediaError) {
        console.error('❌ Error:', mediaError);
        return;
      }

      if (mediaRecords && mediaRecords.length > 0) {
        const openingVideos = mediaRecords.filter(r => r.phase === 'out').map(r => ({...r, url: r.public_url}));
        const closingVideos = mediaRecords.filter(r => r.phase === 'in').map(r => ({...r, url: r.public_url}));
        setOpeningMedia(openingVideos);
        setClosingMedia(closingVideos);
      } else {
        setOpeningMedia([]);
        setClosingMedia([]);
      }
    } catch (err) {
      console.error('❌ Error:', err);
    }
  };

  useEffect(() => {
    const loadRental = async () => {
      try {
        setLoading(true);
        await loadRentalData();
      } catch (err) {
        console.error('❌ Error:', err);
        setError('Failed to load rental details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadRental();
    }
  }, [id]);
  // Use shared timer hook for real-time updates
  const currentTime = useTimer();

  // Calculate time remaining
  useEffect(() => {
    if (!rental?.rental_start_date || !rental?.rental_end_date) return;

    const calculateTimeRemaining = () => {
      const now = new Date(currentTime);
      
      const plannedStart = new Date(rental.rental_start_date);
      const plannedEnd = new Date(rental.rental_end_date);
      const plannedDuration = plannedEnd - plannedStart;
      
      let actualEndTime;
      if (rental.rental_status === 'active' && rental.started_at) {
        const actualStart = new Date(rental.started_at);
        actualEndTime = new Date(actualStart.getTime() + plannedDuration);
      } else {
        actualEndTime = plannedEnd;
      }
      
      const diff = actualEndTime - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${hours}h ${minutes}m`);
      }
    };

    calculateTimeRemaining();
  }, [rental?.rental_start_date, rental?.rental_end_date, rental?.started_at, rental?.rental_status, currentTime]);

  // Calculate elapsed time
  useEffect(() => {
    if (!rental?.started_at || rental.rental_status !== 'active') {
      setElapsedTime('');
      return;
    }

    const updateElapsedTime = () => {
      const now = new Date(currentTime);
      const startDate = new Date(rental.started_at);
      const diff = now - startDate;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (days > 0) {
        setElapsedTime(`${days}d ${hours}h ${minutes}m`);
      } else {
        setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateElapsedTime();
  }, [rental?.started_at, rental?.rental_status, currentTime]);



    /**
   * ENHANCED CAMERA RECORDING - iOS/Android Compatible
   * Ensures mp4 output format for maximum compatibility
   * Torch/flashlight support for both platforms
   */

  
  const switchCamera = async () => {
    if (!isRecording) return;
    
    try {
      console.log('🔄 Switching camera...');
      
      // Stop current recording and stream
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
      
      // Stop canvas rendering
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Toggle facing mode
      const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(newFacingMode);
      
      // Restart with new camera
      const constraints = {
        video: {
          facingMode: newFacingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setRecordingStream(stream);

      // Setup canvas rendering
      if (videoPreviewRef.current && canvasRef.current) {
        const video = videoPreviewRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        video.setAttribute('muted', 'true');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth || 1920;
          canvas.height = video.videoHeight || 1080;
          
          const drawFrame = () => {
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
            animationFrameRef.current = requestAnimationFrame(drawFrame);
          };
          
          video.play().then(() => {
            console.log('✅ Camera switched, canvas rendering started');
            drawFrame();
            window.dispatchEvent(new Event('resize'));
          }).catch(err => {
            console.error('❌ Video play failed after switch:', err);
          });
        };
      }

      // Setup new MediaRecorder
      let mimeType = '';
      const mp4Types = ['video/mp4', 'video/mp4;codecs=avc1', 'video/mp4;codecs=h264'];
      
      for (const type of mp4Types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      if (!mimeType) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000
      });

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('✅ Recording stopped, processing video...');
        
        // Prevent double execution
        if (isProcessingThumbnail) {
          console.log('⚠️ Already processing, skipping duplicate call');
          return;
        }
        setIsProcessingThumbnail(true);
        
        // Create blob with recorded MIME type
        const videoBlob = new Blob(chunks, { type: mimeType });
        const timestamp = Date.now();
        
        // Always use .mp4 extension for consistency
        const filename = `recorded_${timestamp}.mp4`;
        
        // Create preview URL (will be revoked after upload)
        const previewUrl = URL.createObjectURL(videoBlob);

        const fileObj = {
          id: timestamp + Math.random(),
          type: 'video',
          blob: videoBlob,
          url: previewUrl,
          name: filename,
          timestamp: new Date().toISOString(),
          duration: 0,
          size: videoBlob.size,
          source: 'camera',
          mimeType: mimeType
        };

        setCapturedFiles(prev => [...prev, fileObj]);
        setRecordedChunks([]);
        
        // Cleanup camera stream and preview
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Camera track stopped:', track.kind);
        });
        
        // CRITICAL: Properly release camera hardware
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
          videoPreviewRef.current.load();
        }
        
        setRecordingStream(null);
        setIsProcessingThumbnail(false);
        
        console.log('✅ Video ready for upload:', filename);
      };

      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      recorder.start();
      
      console.log(`✅ Camera switched to ${newFacingMode} and recording restarted`);
      
    } catch (err) {
      console.error('❌ Camera switch error:', err);
      alert(`Failed to switch camera: ${err.message}`);
    }
  };

  const startCameraRecording = async () => {
    try {
      console.log('📹 Starting camera recording with Final Fix...');
      console.log('🎯 Initial facingMode:', facingMode);
      
      // Set isRecording FIRST to render DOM elements
      setIsRecording(true);
      
      // Wait for React to render the DOM elements
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log('🔧 Checking refs after DOM render - Video:', !!videoPreviewRef.current, 'Canvas:', !!canvasRef.current);
      
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setRecordingStream(stream);
      
      console.log('✅ Camera stream acquired, waiting for hardware warm-up...');
      console.log('📹 Stream video track settings:', stream.getVideoTracks()[0].getSettings());

      if (videoPreviewRef.current && canvasRef.current) {
        const video = videoPreviewRef.current;
        const canvas = canvasRef.current;
        
        console.log('🔧 Video element exists:', !!video);
        console.log('🔧 Canvas element exists:', !!canvas);
        
        video.muted = true;
        video.setAttribute('muted', 'true');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.playsInline = true;
        video.autoplay = true;
        
        console.log('🔧 Setting up video event handlers...');
        
        // Use Promise to ensure metadata loads
        const metadataPromise = new Promise((resolve) => {
          const handleMetadata = () => {
            console.log('📐 Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
            console.log('🎥 Video readyState:', video.readyState);
            resolve();
          };
          
          // Try both events
          video.onloadedmetadata = handleMetadata;
          video.onloadeddata = handleMetadata;
          
          // Force metadata load after 500ms if events don't fire
          setTimeout(() => {
            if (video.readyState === 0) {
              console.log('⚠️ Forcing metadata load...');
              video.load();
            }
            // Resolve anyway after 1 second
            setTimeout(resolve, 500);
          }, 500);
        });
        
        console.log('📎 Attaching stream to video element...');
        video.srcObject = stream;
        
        // Wait for metadata
        await metadataPromise;
        
        console.log('✅ Metadata loaded, setting canvas dimensions...');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        console.log('📐 Canvas dimensions set:', canvas.width, 'x', canvas.height);
        
        // Force play
        try {
          await video.play();
          console.log('✅ Video playing, starting manual paint loop');
          console.log('🎬 Video currentTime:', video.currentTime);
          
          const paintFrame = () => {
            if (videoPreviewRef.current && !videoPreviewRef.current.paused && videoPreviewRef.current.readyState >= 2) {
              const ctx = canvasRef.current.getContext('2d');
              ctx.drawImage(videoPreviewRef.current, 0, 0, canvas.width, canvas.height);
              animationFrameRef.current = requestAnimationFrame(paintFrame);
            } else {
              // Retry if not ready
              animationFrameRef.current = requestAnimationFrame(paintFrame);
            }
          };
          
          requestAnimationFrame(paintFrame);
          window.dispatchEvent(new Event('resize'));
          console.log('🎨 Paint loop started successfully');
          
        } catch (err) {
          console.error('❌ Video play failed:', err);
        }
        

      } else {
        console.error('❌ Video or Canvas ref not available after 300ms delay!');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Hardware warm-up complete, initializing MediaRecorder...');

      let mimeType = '';
      const mp4Types = [
        'video/mp4',
        'video/mp4;codecs=avc1',
        'video/mp4;codecs=h264'
      ];
      
      for (const type of mp4Types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`✅ Using ${type} for recording`);
          break;
        }
      }
      
      if (!mimeType) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }
      }

      if (!mimeType) {
        throw new Error('No supported video format found on this device');
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000
      });

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        console.log('✅ Recording stopped, processing video...');
        
        // Prevent double execution
        if (isProcessingThumbnail) {
          console.log('⚠️ Already processing, skipping duplicate call');
          return;
        }
        setIsProcessingThumbnail(true);
        
        // Create blob with recorded MIME type
        const videoBlob = new Blob(chunks, { type: mimeType });
        const timestamp = Date.now();
        
        // Always use .mp4 extension for consistency
        const filename = `recorded_${timestamp}.mp4`;
        
        // Create preview URL (will be revoked after upload)
        const previewUrl = URL.createObjectURL(videoBlob);

        const fileObj = {
          id: timestamp + Math.random(),
          type: 'video',
          blob: videoBlob,
          url: previewUrl,
          name: filename,
          timestamp: new Date().toISOString(),
          duration: 0,
          size: videoBlob.size,
          source: 'camera',
          mimeType: mimeType
        };

        setCapturedFiles(prev => [...prev, fileObj]);
        setRecordedChunks([]);
        
        // Cleanup camera stream and preview
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Camera track stopped:', track.kind);
        });
        
        // CRITICAL: Properly release camera hardware
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
          videoPreviewRef.current.load();
        }
        
        setRecordingStream(null);
        setIsProcessingThumbnail(false);
        
        console.log('✅ Video ready for upload:', filename);
      };

      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      recorder.start();
      
      console.log('✅ Recording started with MIME type:', mimeType);

    } catch (err) {
      console.error('❌ Camera recording error:', err);
      setIsRecording(false);
      alert(`Failed to start camera: ${err.message}

Please ensure camera permissions are granted.`);
    }
  };

  const stopCameraRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      
      // Cleanup: Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        console.log('🛑 Paint loop cancelled in stopCameraRecording');
      }
      
      if (torchEnabled) {
        toggleTorch();
      }
    }
  };

  /**
   * Toggle flashlight/torch during recording
   * iOS 15+: Supports torch via ImageCapture API
   * Android Chrome: Native torch support via MediaStreamTrack
   */
  const toggleTorch = async () => {
    if (!recordingStream) return;

    try {
      const videoTrack = recordingStream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();

      // Check if torch is supported on this device
      // iOS 15+: Supports torch via MediaStreamTrack constraints
      // Android Chrome: Native torch support via MediaStreamTrack
      if (!capabilities.torch) {
        alert('Flashlight not supported on this device');
        return;
      }

      const newTorchState = !torchEnabled;
      
      // Apply torch constraint to the video track
      await videoTrack.applyConstraints({
        advanced: [{ torch: newTorchState }]
      });

      setTorchEnabled(newTorchState);
      console.log(`🔦 Torch ${newTorchState ? 'enabled' : 'disabled'}`);

    } catch (err) {
      console.error('❌ Torch toggle error:', err);
      alert('Failed to toggle flashlight');
    }
  };

  // Cleanup camera stream on component unmount
  useEffect(() => {
    return () => {
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [recordingStream]);

  // 🔍 DEBUG - Overage Calculation Data
  useEffect(() => {
    if (rental) {
      console.log('🔍 DEBUG - Overage Calculation Data:', {
        // Odometer readings
        startOdometer: rental.start_odometer,
        endingOdometer: rental.ending_odometer,
        totalDistance: rental.total_distance,
        
        // Calculated distance
        calculatedDistance: rental.ending_odometer && rental.start_odometer 
          ? rental.ending_odometer - rental.start_odometer 
          : 'N/A',
        
        // Package info
        hasPackage: !!rental.package,
        packageId: rental.package?.id,
        packageName: rental.package?.name,
        includedKilometers: rental.package?.included_kilometers,
        extraKmRate: rental.package?.extra_km_rate,
        
        // Overage charge
        overageCharge: rental.overage_charge,
        hasOverageCharge: rental.overage_charge > 0,
        
        // Calculated overage
        calculatedOverage: (() => {
          if (!rental.ending_odometer || !rental.start_odometer) return 0;
          const totalDistance = rental.total_distance || (rental.ending_odometer - rental.start_odometer);
          const includedKms = rental.package?.included_kilometers || 100;
          const extraKms = Math.max(0, totalDistance - includedKms);
          const extraKmRate = rental.package?.extra_km_rate || 1.5;
          return extraKms * extraKmRate;
        })()
      });
    }
  }, [rental]);

  // Auto-close extension modal when closing video is uploaded
  useEffect(() => {
    if (closingMedia.length > 0 && extensionModalOpen) {
      setExtensionModalOpen(false);
    }
  }, [closingMedia, extensionModalOpen]);



    /**
   * ENHANCED GALLERY UPLOAD - iOS .MOV/HEVC Auto-Conversion
   * Automatically converts iOS videos to mp4 before upload
   * Shows conversion progress to user
   */
  const uploadFromGallery = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*,.mov,.MOV'; // Accept all video formats including .MOV
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      console.log('📹 Gallery file selected:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit. Please choose a smaller video.`);
        return;
      }

      setIsUploading(true);
      setIsConverting(true);
      setConversionProgress(0);

      try {
        // Process video: convert iOS .MOV/HEVC to mp4 if needed
        console.log('🔍 Checking if video needs conversion...');
        
        const { blob, converted } = await processVideo(file, (progress) => {
          setConversionProgress(progress);
          console.log(`🔄 Processing: ${progress}%`);
        });

        setIsConverting(false);

        if (converted) {
          console.log('✅ Video converted to mp4 successfully');
        }

        // Create file object with converted blob
        const timestamp = Date.now();
        const filename = file.name.replace(/\.(mov|MOV)$/i, '.mp4');

        const fileObj = {
          id: timestamp + Math.random(),
          type: 'video',
          blob: blob,
          url: URL.createObjectURL(blob),
          name: filename,
          timestamp: new Date().toISOString(),
          duration: 0,
          size: blob.size,
          source: 'gallery',
          converted: converted
        };

        setCapturedFiles(prev => [...prev, fileObj]);
        console.log('✅ Video ready for upload:', filename);

      } catch (error) {
        console.error('❌ Video processing failed:', error);
        alert(`Failed to process video: ${error.message}\n\nPlease try a different video file.`);
      } finally {
        setIsUploading(false);
        setIsConverting(false);
        setConversionProgress(0);
      }
    };

    input.click();
  };


  const removeFile = (fileId) => {
    setCapturedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove && fileToRemove.url) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(file => file.id !== fileId);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // ✅ UPDATED: Enhanced saveMedia with improved retry logic and non-blocking thumbnail generation
    /**
   * ENHANCED SAVE MEDIA - First-Try Upload Success with Progress
   * Implements robust upload with real-time progress tracking
   * Automatic thumbnail generation after successful upload
   * Retry logic only for network errors
   */
  /**
   * ENHANCED SAVE MEDIA - First-Try Upload Success with Progress
   * Implements robust upload with real-time progress tracking
   * Automatic thumbnail generation after successful upload
   * Retry logic only for network errors
   */
  const saveMedia = async (type) => {
    if (capturedFiles.length === 0) {
      alert('Please record or select a video first');
      return;
    }

    setIsProcessingVideo(true);
    setUploadProgress(0);

    try {
      const file = capturedFiles[0];
      console.log(`📤 Starting upload for ${type} video:`, file.name);

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${type}_${rental.id}_${timestamp}_${sanitizedName}`;
      const filePath = `rentals/${rental.id}/${type}/${fileName}`;

      console.log(`📤 Upload path: ${filePath}`);

      // Upload with progress tracking
      // Uses XMLHttpRequest for progress events (fetch doesn't support upload progress)
      const uploadResult = await uploadWithProgress(file.blob, filePath, (progress) => {
        setUploadProgress(progress);
        console.log(`📤 Upload progress: ${progress}%`);
      });

      console.log('✅ Upload successful:', uploadResult.url);

      // Generate thumbnail automatically after upload
      console.log('🖼️ Generating thumbnail...');
      let thumbnailUrl = null;
      
      try {
        // Use existing generateThumbnailSafe utility
        const { generateThumbnailSafe } = await import('../../utils/uploadWithRetry');
        thumbnailUrl = await generateThumbnailSafe(
          file.url,
          `rentals/${rental.id}/${type}/thumb_${fileName.replace(/\.[^.]+$/, '.jpg')}`
        );
        console.log('✅ Thumbnail generated:', thumbnailUrl);
      } catch (thumbError) {
        console.warn('⚠️ Thumbnail generation failed (non-critical):', thumbError);
        // Continue without thumbnail - not critical
      }

      // Insert into rental_media table so RentalVideos component can display it
      const phase = type === 'opening' ? 'out' : 'in';
      const bucket = type === 'opening' ? 'rental-media-opening' : 'rental-media-closing';
      
      const mediaRecord = {
        rental_id: rental.id,
        phase: phase,
        file_type: 'video/mp4',
        file_name: fileName,
        original_filename: file.name,
        file_size: file.blob.size,
        storage_path: filePath,
        public_url: uploadResult.url,
        thumbnail_url: thumbnailUrl || null,
        duration: 0,
        created_at: new Date().toISOString()
      };

      const { error: mediaError } = await supabase
        .from('app_2f7bf469b0_rental_media')
        .insert([mediaRecord]);

      if (mediaError) {
        console.error('❌ Failed to insert media record:', mediaError);
        throw new Error(`Failed to save video record: ${mediaError.message}`);
      }

      // Also update rental record for backward compatibility
      const updateField = type === 'opening' ? 'opening_video_url' : 'closing_video_url';
      const thumbField = type === 'opening' ? 'opening_video_thumbnail' : 'closing_video_thumbnail';
      
      const updateData = {
        [updateField]: uploadResult.url,
        ...(thumbnailUrl && { [thumbField]: thumbnailUrl })
      };

      const { error: updateError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update(updateData)
        .eq('id', rental.id);

      if (updateError) {
        console.warn('⚠️ Failed to update rental record (non-critical):', updateError);
      }

      console.log(`✅ ${type} video saved successfully to rental_media table`);

      // Update local state
      setRental(prev => ({
        ...prev,
        ...updateData
      }));

      // Cleanup
      capturedFiles.forEach(f => URL.revokeObjectURL(f.url));
      setCapturedFiles([]);
      
      if (type === 'opening') {
        setOpeningModalOpen(false);
      } else {
        setClosingModalOpen(false);
      }

      alert(`${type === 'opening' ? 'Opening' : 'Closing'} video uploaded successfully!`);
      
      // Reload media to show the newly uploaded video
      await loadRentalMedia(rental.id);
      
      // Trigger video refresh in RentalVideos component
      setVideoRefreshKey(prev => prev + 1);
      
      console.log('✅ Media list reloaded, video should now be visible');

    } catch (error) {
      console.error(`❌ Failed to save ${type} video:`, error);
      alert(`Failed to upload video: ${error.message}\n\nPlease check your internet connection and try again.`);
    } finally {
      setIsProcessingVideo(false);
      setUploadProgress(0);
    }
  };

  /**
   * Upload with progress tracking and retry logic
   * Uses XMLHttpRequest for upload progress events
   * Retries only on network errors with exponential backoff
   */
  const uploadWithProgress = async (blob, path, onProgress) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`📤 Upload attempt ${attempt}/${maxRetries}`);

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('rental-videos')
          .upload(path, blob, {
            contentType: 'video/mp4',
            upsert: false,
            onUploadProgress: (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              onProgress(percent);
            }
          });

        if (error) {
          // Check if it's a network error (retryable)
          if (error.message.includes('network') || error.message.includes('timeout')) {
            throw new Error('NETWORK_ERROR: ' + error.message);
          }
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('rental-videos')
          .getPublicUrl(path);

        return {
          path: data.path,
          url: urlData.publicUrl
        };

      } catch (error) {
        console.error(`❌ Upload attempt ${attempt} failed:`, error);

        // Retry only on network errors
        if (error.message.startsWith('NETWORK_ERROR') && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`⏳ Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Non-network error or max retries reached
        throw error;
      }
    }

    throw new Error('Upload failed after maximum retries');
  };


  /**
   * Upload with progress tracking and retry logic
   * Uses XMLHttpRequest for upload progress events
   * Retries only on network errors with exponential backoff
   */
  



  const startRental = async () => {
    if (!isPaymentSufficient()) {
      alert('⚠️ Payment must be "Paid" before starting the rental.');
      return;
    }

    if (openingMedia.length === 0) {
      setOpeningModalOpen(true);
      return;
    }

    try {
      const { data: updatedRental, error: rentalError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({ rental_status: 'active', started_at: new Date().toISOString() })
        .eq('id', rental.id)
        .select('*, vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*), package:rental_packages(*)')
        .single();

      if (rentalError) throw rentalError;
      
      if (rental.vehicle_id) {
        const { error: vehicleError } = await supabase
          .from('saharax_0u4w4d_vehicles')
          .update({ status: 'rented' })
          .eq('id', rental.vehicle_id);
        
        if (vehicleError) {
          console.error('Failed to update vehicle status:', vehicleError);
        }
      }
      
      alert('✅ Rental started successfully!');
      setRental(updatedRental);
      
    } catch (err) {
      console.error('❌ Error:', err);
      alert('Failed to start rental. Please try again.');
    }
  };

  const completeRental = async () => {
    // Prevent duplicate calls
    if (isProcessingEndOdometer) {
      return;
    }

    // Step 1: Check if closing video exists
    if (closingMedia.length === 0) {
      setClosingModalOpen(true);
      return;
    }

    // Step 2: Check if ending odometer is already recorded
    if (!rental.ending_odometer) {
      // Show End Odometer Prompt to user
      setShowEndOdometerPrompt(true);
      return;
    }

    // Step 3: If both closing video and ending odometer exist, complete the rental
    try {
      const { error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({ 
          rental_status: 'completed', 
          completed_at: new Date().toISOString() 
        })
        .eq('id', rental.id);

      if (error) throw error;
      
      if (rental.vehicle_id) {
        const { error: vehicleError } = await supabase
          .from('saharax_0u4w4d_vehicles')
          .update({ status: 'available' })
          .eq('id', rental.vehicle_id);
        
        if (vehicleError) {
          console.error('Failed to update vehicle status:', vehicleError);
        }
      }
      
      alert('Rental completed successfully!');
      navigate('/admin/rentals');
    } catch (err) {
      console.error('❌ Error:', err);
      alert('Failed to complete rental. Please try again.');
    }
  };
  const cancelRental = async () => {
    if (confirm('Are you sure you want to cancel this rental?')) {
      try {
        const { error } = await supabase
          .from('app_4c3a7a6153_rentals')
          .update({ rental_status: 'cancelled' })
          .eq('id', rental.id);

        if (error) throw error;
        
        if (rental.vehicle_id) {
          const { error: vehicleError } = await supabase
            .from('saharax_0u4w4d_vehicles')
            .update({ status: 'available' })
            .eq('id', rental.vehicle_id);
          
          if (vehicleError) {
            console.error('Failed to update vehicle status:', vehicleError);
          }
        }
        
        alert('Rental cancelled successfully!');
        navigate('/admin/rentals');
      } catch (err) {
        console.error('❌ Error:', err);
        alert('Failed to cancel rental. Please try again.');
      }
    }
  };

  const handleViewCustomerDetails = (customerId) => {
    setCustomerDetailsDrawer({
      isOpen: true,
      customerId: customerId,
      rental: rental
    });
  };

  const handleEditPrice = () => {
    setManualPrice(rental.total_amount?.toString() || '');
    setPriceOverrideReason('');
    setIsEditingPrice(true);
  };

  const handleCancelEditPrice = () => {
    setIsEditingPrice(false);
    setManualPrice('');
    setPriceOverrideReason('');
  };

  const handleSaveManualPrice = async () => {
    if (!manualPrice || parseFloat(manualPrice) <= 0) {
      alert('Please enter a valid price amount.');
      return;
    }

    setIsSavingPrice(true);
    try {
      const newPrice = parseFloat(manualPrice);
      const isAdmin = canApprovePriceOverrides(currentUser);

      let updateData = {
        updated_at: new Date().toISOString()
      };

      if (isAdmin) {
        updateData.total_amount = newPrice;
        updateData.remaining_amount = Math.max(0, newPrice - (parseFloat(rental.deposit_amount) || 0));
        updateData.approval_status = 'auto';
        updateData.pending_total_request = null;
        updateData.price_override_reason = priceOverrideReason || null;
        updateData.requested_by_id = currentUser?.id;
      } else {
        updateData.approval_status = 'pending';
        updateData.pending_total_request = newPrice;
        updateData.price_override_reason = priceOverrideReason || null;
        updateData.requested_by_id = currentUser?.id;
      }

      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update(updateData)
        .eq('id', rental.id)
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*),
          package:rental_packages(*),
          extensions:rental_extensions(*)
        `)
        .single();

      if (error) throw error;

      setRental(data);
      setIsEditingPrice(false);
      setManualPrice('');
      setPriceOverrideReason('');
      
      if (isAdmin) {
        alert('✅ Price updated successfully!');
      } else {
        alert('✅ Price override request submitted for admin approval.');
      }
    } catch (err) {
      console.error('❌ Error saving price:', err);
      alert(`Failed to save price. Error: ${err.message}`);
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleApprovePrice = async () => {
    if (!rental.pending_total_request) {
      alert('No pending price request found.');
      return;
    }

    if (!confirm(`Approve manual price of ${rental.pending_total_request} MAD?`)) {
      return;
    }

    try {
      const newPrice = parseFloat(rental.pending_total_request);
      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          total_amount: newPrice,
          remaining_amount: Math.max(0, newPrice - (parseFloat(rental.deposit_amount) || 0)),
          approval_status: 'auto',
          pending_total_request: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id)
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*),
          package:rental_packages(*)
        `)
        .single();

      if (error) throw error;

      setRental(data);
      alert('✅ Price override approved!');
    } catch (err) {
      console.error('❌ Error approving price:', err);
      alert(`Failed to approve price. Error: ${err.message}`);
    }
  };

  const handleDeclinePrice = async () => {
    if (!rental.pending_total_request) {
      alert('No pending price request found.');
      return;
    }

    if (!confirm('Decline this price override request? The price will be recalculated automatically.')) {
      return;
    }

    try {
      let autoCalculatedPrice = rental.total_amount;
      
      if (rental.vehicle?.id && rental.rental_start_date && rental.rental_end_date) {
        try {
          const priceResult = await PricingRulesService.calculatePrice(
            rental.vehicle.id,
            rental.rental_start_date,
            rental.rental_end_date,
            rental.rental_type || 'daily'
          );
          if (priceResult.price > 0) {
            autoCalculatedPrice = priceResult.price;
          }
        } catch (calcError) {
          console.warn('⚠️ Could not recalculate price:', calcError);
        }
      }

      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          total_amount: autoCalculatedPrice,
          remaining_amount: Math.max(0, autoCalculatedPrice - (parseFloat(rental.deposit_amount) || 0)),
          approval_status: 'declined',
          pending_total_request: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id)
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*),
          package:rental_packages(*)
        `)
        .single();

      if (error) throw error;

      setRental(data);
      alert('✅ Price override declined. Price recalculated to auto rate.');
    } catch (err) {
      console.error('❌ Error declining price:', err);
      alert(`Failed to decline price. Error: ${err.message}`);
    }
  };

  const handleVideoUpdate = () => {
    console.log('🔄 Video update triggered, refreshing media...');
    loadRentalMedia(rental.id);
    setVideoRefreshKey(prev => prev + 1);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;

  // ✅ FIXED: Calculate rental base amount correctly for hourly rentals
  const calculateRentalBaseAmount = () => {
    if (!rental) return 0;
    
    // For hourly rentals, multiply unit_price by quantity_days (which stores hours)
    if (rental.rental_type === 'hourly' && rental.quantity_days) {
      return (rental.unit_price || 0) * (rental.quantity_days || 0);
    }
    
    // For other rental types, use unit_price or total_amount
    return rental.unit_price || rental.total_amount || 0;
  };
  if (error) return <div className="flex items-center justify-center min-h-screen"><p>{error}</p></div>;

  // Button state logic
  const canSendContract = rental?.signature_url && !isGeneratingContract && !isSendingWhatsApp;
  const canSendReceipt = rental?.payment_status === 'paid' && !isGeneratingReceipt && !isSendingWhatsApp;
  const canSendBoth = canSendContract && canSendReceipt && !isGeneratingBoth && !isSendingWhatsApp;

  if (!rental) return <div className="flex items-center justify-center min-h-screen"><p>Rental not found</p></div>;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isActive = rental.rental_status?.toLowerCase() === 'active';
  const isScheduled = rental.rental_status?.toLowerCase() === 'scheduled';
  const isCompleted = rental.rental_status?.toLowerCase() === 'completed';
  const hasOpeningVideo = openingMedia.length > 0;
  const hasOdometerReading = !!rental.start_odometer;
  const canStartRental = isPaymentSufficient() && (rental.contract_signed || !!rental.signature_url) && hasOpeningVideo && hasOdometerReading;
  const hasSecondDriver = rental?.second_driver_name || rental?.second_driver_license || rental?.second_driver_id_image;
  const isPendingApproval = rental.approval_status === 'pending';
  const isAdmin = canApprovePriceOverrides(currentUser);
  
  const canSignContract = hasOpeningVideo && !rental.contract_signed && !rental.signature_url;
  const canSendWhatsApp = rental.contract_signed || !!rental.signature_url;
  const canGenerateInvoice = rental.contract_signed || !!rental.signature_url;

  const formattedRentalForInvoice = {
    ...rental,
    customer_license_number: 'N/A',
    vehicle_details: rental.vehicle,
    start_date: rental.rental_start_date ? new Date(rental.rental_start_date).toLocaleString() : 'N/A',
    end_date: rental.rental_end_date ? new Date(rental.rental_end_date).toLocaleString() : 'N/A',
  };

// ✅ Calculate extension totals before rendering
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-20 sm:pb-8">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => navigate('/admin/rentals')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rentals
        </Button>
        <div className="hidden sm:flex gap-2">
          {!rental.contract_signed && !rental.signature_url && rental.rental_status !== 'completed' && (
              <Button
                disabled={!canSignContract}
                onClick={() => setIsSigning(true)}
                title={!hasOpeningVideo ? "Please upload opening video before signing" : "Sign contract"}
              >
                  <FileSignature className="w-4 h-4 mr-2" />
                  Sign Contract
              </Button>
            )}
            {rental?.customer_phone && (
              <>
              <Button
  onClick={() => setContractPreviewModal(true)}
  disabled={!rental.signature_url}
  className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
>
  <FileText className="h-4 w-4" />
  Contract
</Button>
              <Button
  onClick={async () => {
    if (isMobileDevice()) {
      await forceMobileRender();
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    setReceiptPreviewModal(true);
  }}
  disabled={rental.payment_status !== 'paid'}
  className="bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2"
>
  <Receipt className="h-4 w-4" />
  Receipt
</Button>
              <Button
                onClick={() => setWhatsappModalOpen(true)}
                disabled={!canSendBoth}
                className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                title={!canSendBoth ? "Need signed contract and completed payment" : "Send both documents via WhatsApp"}
              >
                <FaWhatsapp size={18} />
                WhatsApp
              </Button>
                          </>
            )}
              <Button 
                onClick={() => setWhatsappModalOpen(true)} 
                disabled={isSharing || !canSendWhatsApp} 
                className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
                title={!canSendWhatsApp ? "Please sign the contract before sending WhatsApp" : "Choose what to send via WhatsApp"}
              >
                  <FaWhatsapp size={18} />
                  WhatsApp
              </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-lg sm:text-xl">
            <div className="flex flex-col mb-2 sm:mb-0">
              <span>{rental.vehicle?.name} - {rental.vehicle?.model}</span>
              <span className="text-sm font-normal text-gray-500 mt-1">Rental ID: {rental.id}</span>
            </div>
            <Badge className={`${getStatusColor(rental.rental_status)} self-start sm:self-center`}>{rental.rental_status?.toUpperCase()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* SCHEDULED Rental - Show Workflow Steps */}
          {isScheduled && !rental.contract_signed && !rental.signature_url && (
            <div className="border-2 border-yellow-200 rounded-lg p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-white">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
                  Ready to Start Rental
                </h3>
                <p className="text-sm text-gray-600">Complete these steps to begin the rental:</p>
              </div>

              <div className="space-y-4">
                {/* Step 1: Upload Opening Video */}
                <div className={`flex items-start gap-3 p-3 rounded-lg ${hasOpeningVideo ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${hasOpeningVideo ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {hasOpeningVideo ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-white font-bold">1</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base">Vehicle Inspection</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {hasOpeningVideo ? '✓ Opening video uploaded' : 'Record vehicle condition before handover'}
                    </p>
                    {!hasOpeningVideo && (
                      <Button 
                        onClick={() => setOpeningModalOpen(true)}
                        size="sm"
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Upload Video
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step 2: Starting Odometer */}
                <div className={`flex items-start gap-3 p-3 rounded-lg ${hasOdometerReading ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${hasOdometerReading ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {hasOdometerReading ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-white font-bold">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base">Starting Odometer</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {hasOdometerReading ? `✓ Starting odometer: ${rental.start_odometer} km` : 'Enter starting kilometer reading'}
                    </p>
                    {!hasOdometerReading && !isEditingOdometer && (
                      <Button 
                        onClick={() => setIsEditingOdometer(true)}
                        size="sm"
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Gauge className="w-4 h-4 mr-2" />
                        Add Reading
                      </Button>
                    )}
                    {isEditingOdometer && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="number"
                          value={startOdometer}
                          onChange={(e) => setStartOdometer(e.target.value)}
                          placeholder="Enter odometer reading (km)"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="1"
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            onClick={handleSaveOdometer}
                            disabled={isSavingOdometer}
                            size="sm"
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {isSavingOdometer ? 'Saving...' : 'Save'}
                          </Button>
                          <Button 
                            onClick={() => {
                              setIsEditingOdometer(false);
                              if (rental.start_odometer) {
                                setStartOdometer(rental.start_odometer.toString());
                              } else if (rental.vehicle?.current_odometer) {
                                setStartOdometer(rental.vehicle.current_odometer.toString());
                              } else {
                                setStartOdometer('');
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    {hasOdometerReading && (
                      <Button 
                        onClick={() => setIsEditingOdometer(true)}
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Reading
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step 3: Payment */}
                <div className={`flex items-start gap-3 p-3 rounded-lg ${isPaymentSufficient() ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isPaymentSufficient() ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {isPaymentSufficient() ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-white font-bold">3</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base">Payment</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {isPaymentSufficient() ? '✓ Payment received' : 'Complete rental payment'}
                    </p>
                    {!isPaymentSufficient() && (
                      <Button 
                        onClick={markAsPaid}
                        disabled={isUpdatingPayment}
                        size="sm"
                        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isUpdatingPayment ? 'Updating...' : 'Mark Paid'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step 4: Sign Contract */}
                <div className={`flex items-start gap-3 p-3 rounded-lg ${(rental.contract_signed || rental.signature_url) ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${(rental.contract_signed || rental.signature_url) ? 'bg-green-500' : 'bg-gray-300'}`}>
                    {(rental.contract_signed || rental.signature_url) ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-white font-bold">4</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm sm:text-base">Sign Contract</h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {(rental.contract_signed || rental.signature_url) ? '✓ Contract signed' : 'Customer signs rental agreement'}
                    </p>
                    {!rental.contract_signed && !rental.signature_url && rental.rental_status !== 'completed' && (
                      <Button 
                        onClick={() => setIsSigning(true)}
                        disabled={!hasOpeningVideo}
                        size="sm"
                        className="mt-2"
                        title={!hasOpeningVideo ? "Please upload opening video first" : "Sign contract"}
                      >
                        <FileSignature className="w-4 h-4 mr-2" />
                        Sign Contract
                      </Button>
                    )}
                  </div>
                </div>

                {/* Start Rental Button */}
                {isPaymentSufficient() && hasOpeningVideo && (rental.contract_signed || rental.signature_url) && hasOdometerReading && (
                  <div className="pt-4 text-center">
                    <Button 
                      onClick={startRental}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg font-semibold shadow-lg"
                    >
                      <PlayCircle className="w-6 h-6 mr-2" />
                      Start Rental Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contract Signed but Not Started - Show Start Button */}
          {(rental.contract_signed || rental.signature_url) && !isCompleted && !isActive && (
            <div className="border-2 border-gray-200 rounded-lg p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span>Rental Timer</span>
                </h3>
              </div>

              <div className="text-center py-6 sm:py-8">
                <div className="mb-4 sm:mb-6">
                  <p className="text-sm sm:text-base text-gray-600 mb-2">Contract signed and ready to start</p>
                  <p className="text-xs sm:text-sm text-gray-500">Click "Start Now" to begin the rental timer</p>
                </div>
                <Button 
                  onClick={startRental} 
                  disabled={!canStartRental}
                  className={`${!canStartRental ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105`}
                >
                  <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                  Start Now
                </Button>
                {!canStartRental && (
                  <p className="text-xs text-red-500 mt-3">
                    {!isPaymentSufficient() ? 'Payment required' : !hasOpeningVideo ? 'Opening video required' : !hasOdometerReading ? 'Odometer reading required' : 'Requirements not met'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Active Rental - Show Timer */}
          {isActive && (
            <div className="border-2 border-gray-200 rounded-lg p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span>Rental Timer</span>
                </h3>
                <Badge className="bg-green-100 text-green-800 px-3 py-1 self-start sm:self-auto">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                    Active
                  </div>
                </Badge>
              </div>

              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">Time Elapsed</p>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600 break-all">{elapsedTime || '00:00:00'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">Time Remaining</p>
                    </div>
                    <p className={`text-2xl sm:text-3xl font-bold break-all ${timeRemaining === 'Expired' ? 'text-red-600' : 'text-blue-600'}`}>
                      {timeRemaining || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button 
                    onClick={completeRental}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    <StopCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    End Now
                  </Button>
                  
                  {closingMedia.length === 0 && (
                  <Button 
                    onClick={() => setExtensionModalOpen(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                  >
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                    Extend Time
                  </Button>
                )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {(isScheduled || isActive || isCompleted) && (
        <div className="mb-6">
          <RentalVideos 
            key={videoRefreshKey} 
            rental={rental} 
            onUpdate={handleVideoUpdate} 
            isProcessing={isProcessingVideo} 
          />
        </div>
      )}

      {/* Extension History Section */}
      {extensions.length > 0 && (
        <div className="mb-6">
          <ExtensionHistory 
            extensions={extensions}
            onApprove={handleApproveExtension}
            onReject={handleRejectExtension}
            isAdmin={isAdmin}
          />

              {/* Completed Rental Message */}
              {closingMedia.length > 0 && rental.rental_status === 'completed' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-900">Rental Completed</h4>
                      <p className="text-sm text-green-700 mt-1">
                        This rental has been completed and closed. Extensions are no longer available.
                      </p>
                    </div>
                  </div>
                </div>
              )}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-xl">Rental Information</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 text-lg">Customer Details</h3>
             <Button onClick={() => handleViewCustomerDetails(rental.customer_id)} size="sm" className="bg-blue-100 text-blue-800 hover:bg-blue-200"><User className="w-4 h-4 mr-2" />View Details</Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm sm:text-base">
              <p><strong>Full Name:</strong> {rental.customer_name}</p>
              <p><strong>Email:</strong> {rental.customer_email}</p>
              <p><strong>Phone:</strong> {rental.customer_phone}</p>
              <p><strong>ID/License:</strong> {'N/A'}</p>
            </div>
          </div>
          {hasSecondDriver && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 text-lg">Second Driver Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm sm:text-base">
                  <p><strong>Full Name:</strong> {rental.second_driver_name || '—'}</p>
                  <p><strong>License:</strong> {rental.second_driver_license || '—'}</p>
                </div>
                <Button onClick={() => setSecondDriverModalOpen(true)} size="sm" className="mt-4 bg-gray-100 text-gray-800 hover:bg-gray-200">
                    <Users className="w-4 h-4 mr-2" />
                    View Second Driver
                </Button>
              </div>
            </>
          )}
          <Separator />
          <div>
            <h3 className="font-semibold mb-3 text-lg">Vehicle Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm sm:text-base">
              <p><strong>Vehicle:</strong> {rental.vehicle?.name}</p>
              <p><strong>Model:</strong> {rental.vehicle?.model}</p>
              <p><strong>Plate:</strong> {rental.vehicle?.plate_number}</p>
              <p><strong>Type:</strong> {rental.vehicle?.vehicle_type}</p>
              {rental.start_odometer && (
                <p><strong>Start Odometer:</strong> {rental.start_odometer} km</p>
              )}
              {rental.ending_odometer && (
                <p><strong>End Odometer:</strong> {rental.ending_odometer} km</p>
              )}
              {rental.total_kilometers_driven && (
                <p><strong>Total Distance:</strong> {(rental.total_kilometers_driven || 0).toFixed(2)} km</p>
              )}
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold mb-3 text-lg">Rental Period</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm sm:text-base">
              <p><strong>Start:</strong> {new Date(rental.rental_start_date).toLocaleString()}</p>
              <p><strong>End:</strong> {new Date(rental.rental_end_date).toLocaleString()}</p>
              <p><strong>Type:</strong> <span className="capitalize">{rental.rental_type}</span></p>
              <p><strong>Pickup:</strong> {rental.pickup_location}</p>
            </div>
          </div>
           <Separator />
          <div>
            <h3 className="font-semibold mb-3 text-lg">Inclusions & Add-ons</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm sm:text-base">
                <p><strong>Insurance:</strong> {rental.insurance_included ? 'Yes' : 'No'}</p>
                <p><strong>Helmet:</strong> {rental.helmet_included ? 'Yes' : 'No'}</p>
                <p><strong>Gear:</strong> {rental.gear_included ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <Separator />
          <div>
            <h3 className="font-semibold mb-3 text-lg">Financial Information</h3>
            
            {isPendingApproval && (
              <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Pending Admin Approval</strong>
                  <p className="mt-1">Manual price override requested: <strong>{rental.pending_total_request} MAD</strong></p>
                  {rental.price_override_reason && (
                    <p className="mt-1 text-sm">Reason: {rental.price_override_reason}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isPendingApproval && isAdmin && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Price Approval Required</h4>
                <div className="space-y-2 mb-3 text-sm">
                  <p><strong>Current Auto Price:</strong> {rental.total_amount} MAD</p>
                  <p><strong>Requested Manual Price:</strong> {rental.pending_total_request} MAD</p>
                  {rental.price_override_reason && (
                    <p><strong>Reason:</strong> {rental.price_override_reason}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleApprovePrice}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    onClick={handleDeclinePrice}
                    variant="destructive"
                    size="sm"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {!isEditingPrice ? (
              <div className="space-y-3 text-sm sm:text-base">
                {/* Package Information */}
                {rental.package && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Kilometer Package
                    </h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Package:</strong> {rental.package.package_name || '100km Package'}</p>
                      <p><strong>Included Kilometers:</strong> {rental.included_kilometers || rental.package.included_kilometers} km</p>
                      <p><strong>Extra KM Rate:</strong> {rental.extra_km_rate_applied || rental.package.extra_km_rate} MAD/km</p>
                    </div>
                  </div>
                )}
                
                {/* Distance Summary */}
                {rental.total_kilometers_driven > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                    <h4 className="font-semibold text-gray-900 mb-2">🚗 Distance Traveled</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Start Odometer:</span>
                        <span className="font-medium">{rental.start_odometer} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span>End Odometer:</span>
                        <span className="font-medium">{rental.ending_odometer} km</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="font-semibold">Total Distance:</span>
                        <span className="font-bold text-blue-600">{(rental.total_kilometers_driven || 0).toFixed(2)} km</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Financial Breakdown */}
                <div className="space-y-2">
                  {/* Rental Type Price */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {rental.rental_type === 'daily' ? 'Daily Rental Rate:' : 
                       rental.rental_type === 'weekly' ? 'Weekly Rental Rate:' : 
                       rental.rental_type === 'monthly' ? 'Monthly Rental Rate:' : 
                       'Base Rental Rate:'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(rental.unit_price || rental.total_amount)} MAD</span>
                      {!isPendingApproval && (
                        <Button 
                          onClick={handleEditPrice}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Edit price"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Overage Charge */}
                  {rental.overage_charge > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-2">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Kilometer Overage
                        </h4>
                        <span className="px-3 py-1 text-sm font-semibold bg-yellow-100 text-yellow-800 rounded-lg">
                          +{formatCurrency(rental.overage_charge)} MAD
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {(() => {
                          const startKm = rental.start_odometer || 0;
                          const endKm = rental.ending_odometer || 0;
                          const totalDistance = rental.total_distance || (endKm - startKm);
                          const includedKms = rental.package?.included_kilometers || rental.included_kilometers || 100;
                          const extraKms = Math.max(0, totalDistance - includedKms);
                          const extraKmRate = rental.package?.extra_km_rate || rental.extra_km_rate_applied || 1.5;
                          
                          return (
                            <>
      {mobileLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-700">Initializing mobile view...</p>
          </div>
        </div>
      )}


                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Total Distance:</span>
                                  <p className="font-medium">{totalDistance.toFixed(2)} km</p>
                                </div>
                                <div>
                                  <span className="text-gray-600">Included Kilometers:</span>
                                  <p className="font-medium">{includedKms} km</p>
                                </div>
                              </div>
                              
                              <div className="pt-3 border-t border-yellow-200">
                                <div className="text-sm">
                                  <div className="flex justify-between">
                                    <span>Extra Kilometers:</span>
                                    <span className="font-medium">{extraKms.toFixed(2)} km</span>
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span>Rate per km:</span>
                                    <span className="font-medium">{extraKmRate.toFixed(2)} MAD/km</span>
                                  </div>
                                  <div className="flex justify-between mt-2 pt-2 border-t border-yellow-100">
                                    <span className="font-semibold">Overage Charge:</span>
                                    <span className="font-semibold text-red-600">
                                      +{formatCurrency(rental.overage_charge)} MAD
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}


            {rental.extension_count > 0 && (
              <>
                <Separator className="my-4" />
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 my-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-purple-800 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Extension Information
                    </h4>
                    <span className="px-3 py-1 text-sm font-semibold bg-purple-100 text-purple-800 rounded-lg">
                      +{formatCurrency(totalExtensionFees || 0)} MAD
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Extensions:</span>
                        <p className="font-medium">{rental.extension_count}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Extended Hours:</span>
                        <p className="font-medium">{totalExtendedHours || 0}h</p>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-purple-200">
                      <div className="text-sm">
                        {rental.original_end_date && (
                          <div className="flex justify-between mb-2">
                            <span className="text-gray-600">Original End Date:</span>
                            <span className="font-medium">{new Date(rental.original_end_date).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between mt-2 pt-2 border-t border-purple-100">
                          <span className="font-semibold">Extension Fees:</span>
                          <span className="font-semibold text-purple-600">
                            +{formatCurrency(totalExtensionFees || 0)} MAD
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
                  


                  

                  
                  {/* Grand Total */}
                  <div className="flex justify-between pt-2 border-t-2 border-gray-300 text-lg">
                    <span className="font-bold text-gray-900">Grand Total:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0))} MAD
                    </span>
                  </div>
                  
                  {/* Deposit */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit Paid:</span>
                    <span className="font-medium">{formatCurrency(rental.deposit_amount || 0)} MAD</span>
                  </div>
                  
                  {/* ✅ UPDATED: Balance Due Display with Deposit Deduction Logic */}
                  {(() => {
                    const totalAmount = calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0);
                    const depositPaid = rental.deposit_amount || 0;
                    const balance = totalAmount - depositPaid;
                    const isCoveredByDeposit = rental.deposit_returned_at && balance > 0;
                    
                    if (isCoveredByDeposit) {
                      // Balance was covered by deposit deduction
                      return (
                        <div className="flex justify-between font-bold p-2 rounded bg-green-50 text-green-700">
                          <div className="flex flex-col">
                            <span>✅ Balance Covered</span>
                            <span className="text-xs text-gray-500 font-normal">
                              ({formatCurrency(balance)} MAD deducted from damage deposit)
                            </span>
                          </div>
                          <span className="text-lg">0.00 MAD</span>
                        </div>
                      );
                    } else if (balance > 0) {
                      return (
                        <div className="flex justify-between font-bold p-2 rounded bg-red-50 text-red-700">
                          <span>⚠️ Balance Due:</span>
                          <span className="text-lg">{formatCurrency(balance)} MAD</span>
                        </div>
                      );
                    } else if (balance < 0) {
                      return (
                        <div className="flex justify-between font-bold p-2 rounded bg-green-50 text-green-700">
                          <span>💰 Refund Due:</span>
                          <span className="text-lg">{formatCurrency(Math.abs(balance))} MAD</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="flex justify-between font-bold p-2 rounded bg-green-50 text-green-700">
                          <span>✅ Fully Paid</span>
                          <span className="text-lg">0.00 MAD</span>
                        </div>
                      );
                    }
                  })()}
                  
                  {/* Damage Deposit */}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Damage Deposit:</span>
                    <span className="font-medium">{formatCurrency(rental.damage_deposit || 0)} MAD</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                <h4 className="font-semibold text-gray-900">Edit Total Amount</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Total Amount (MAD)
                    </label>
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason (Optional)
                    </label>
                    <textarea
                      value={priceOverrideReason}
                      onChange={(e) => setPriceOverrideReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Explain why you're changing the price..."
                      rows="2"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveManualPrice}
                    disabled={isSavingPrice}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSavingPrice ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    onClick={handleCancelEditPrice}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
                {!isAdmin && (
                  <p className="text-xs text-gray-600">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Your price change will require admin approval before taking effect.
                  </p>
                )}
              </div>
            )}


            {/* Late Fee Warning */}
            {lateFee?.is_late && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-bold text-red-800 mb-2">⚠️ Late Return Fee</h3>
                <p className="text-red-700">
                  Customer returned {Math.floor(lateFee.late_minutes / 60)} hours late.
                  Late fee: <strong>{lateFee.late_fee} MAD</strong>
                </p>
                <p className="text-sm text-red-600 mt-1">
                  New total: {rental.total_amount + lateFee.late_fee} MAD
                </p>
              </div>
            )}

            {/* ✅ UPDATED: Damage Deposit Return Section with Deduction Logic */}
            {rental?.rental_status === 'completed' && rental?.damage_deposit > 0 && (() => {
              const depositCalc = calculateDepositReturn();
              const isDepositReturned = !!rental.deposit_returned_at;
              const shouldShowToggle = !isDepositReturned && depositCalc.balanceDue > 0;
              
              return (
                <div className="mt-4 p-4 border-t border-gray-200">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">💰 Damage Deposit Return</h4>
                  
                  <div className="space-y-3">
                    {/* Toggle Switch for Deposit Deduction */}
                    {shouldShowToggle && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3 border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-800">Deduct from damage deposit?</p>
                          <p className="text-sm text-gray-600">
                            Toggle ON to deduct unpaid balance of {depositCalc.balanceDue.toFixed(2)} MAD from deposit
                          </p>
                        </div>
                        <button
                          onClick={() => setDeductFromDeposit(!deductFromDeposit)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${deductFromDeposit ? 'bg-green-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${deductFromDeposit ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )}

                    {/* Deduction Breakdown - Show when toggle is ON */}
                    {shouldShowToggle && deductFromDeposit && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-3 space-y-2">
                        <h5 className="font-semibold text-blue-800">Deduction Breakdown</h5>
                        
                        <div className="flex justify-between text-sm">
                          <span>Original Deposit:</span>
                          <span className="font-medium">{depositCalc.damageDeposit.toFixed(2)} MAD</span>
                        </div>
                        
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Less: Unpaid Balance:</span>
                          <span className="font-medium">-{depositCalc.balanceDue.toFixed(2)} MAD</span>
                        </div>
                        
                        <div className="flex justify-between text-sm font-bold border-t border-blue-200 pt-2">
                          <span>Final Return:</span>
                          <span className="text-green-600">{depositCalc.depositReturn.toFixed(2)} MAD</span>
                        </div>
                        
                        {depositCalc.additionalOwed > 0 && (
                          <div className="bg-red-50 p-2 rounded text-sm text-red-700">
                            ⚠️ Additional {depositCalc.additionalOwed.toFixed(2)} MAD still owed
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Deposit Breakdown */}
                    <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">Original Damage Deposit:</span>
                        <span className="font-semibold">{depositCalc.damageDeposit.toFixed(2)} MAD</span>
                      </div>
                      
                      {depositCalc.hasDeduction && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Less: Unpaid Balance:</span>
                          <span className="font-semibold">-{depositCalc.balanceDue.toFixed(2)} MAD</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-base font-bold border-t border-blue-200 pt-2">
                        <span className="text-gray-800">Amount to Return:</span>
                        <span className="text-green-600">{depositCalc.depositReturn.toFixed(2)} MAD</span>
                      </div>
                      
                      {depositCalc.additionalOwed > 0 && (
                        <div className="flex justify-between text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
                          <span className="font-semibold">⚠️ Additional Amount Owed:</span>
                          <span className="font-bold">{depositCalc.additionalOwed.toFixed(2)} MAD</span>
                        </div>
                      )}
                    </div>

                    {/* Undo Button */}
                    {deductFromDeposit && !isDepositReturned && (
                      <button
                        onClick={() => setDeductFromDeposit(false)}
                        className="text-sm text-gray-600 hover:text-gray-800 underline mb-2"
                      >
                        Undo deduction
                      </button>
                    )}
                    
                    {/* Signature Section */}
                    {!isDepositReturned ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setShowDepositSignatureModal(true)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                          disabled={depositCalc.depositReturn <= 0}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Sign Here - Confirm Deposit Received
                        </button>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-semibold">Deposit Returned</span>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <p><strong>Amount:</strong> {rental.deposit_return_amount?.toFixed(2)} MAD</p>
                          <p><strong>Date:</strong> {new Date(rental.deposit_returned_at).toLocaleString()}</p>
                          {rental.deposit_deduction_amount > 0 && (
                            <p className="text-red-600"><strong>Deducted:</strong> {rental.deposit_deduction_amount.toFixed(2)} MAD (Unpaid balance)</p>
                          )}
                        </div>
                        {rental.deposit_return_signature_url && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-1">Customer Signature:</p>
                            <img 
                              src={rental.deposit_return_signature_url} 
                              alt="Deposit Return Signature" 
                              className="border border-gray-300 rounded max-w-xs h-24 object-contain bg-white"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {depositCalc.depositReturn <= 0 && !isDepositReturned && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm text-yellow-800">
                        ⚠️ No deposit to return. {depositCalc.hasDeduction ? 'Unpaid balance has been deducted from damage deposit.' : 'Damage deposit was 0.'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            

            {/* ✅ UPDATED: Desktop-only Mark as Paid button */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
                <strong>Payment Status:</strong> 
                {getPaymentStatusBadge(rental.payment_status)}
                {/* Desktop-only Mark as Paid button */}
                <div className="hidden sm:block">
                    {(() => {
                        const totalAmount = calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0);
                        const depositPaid = rental.deposit_amount || 0;
                        const balanceDue = totalAmount - depositPaid;
                        const damageDeposit = parseFloat(rental?.damage_deposit || 0);
                        const depositToReturn = Math.max(0, damageDeposit - balanceDue);
                        
                        const isBalanceCoveredByDeposit = balanceDue > 0 && rental.deposit_returned_at && Math.abs((damageDeposit - balanceDue) - depositToReturn) < 0.01;
                        
                        return rental.payment_status?.toLowerCase() !== 'paid' && !isPendingApproval && !isBalanceCoveredByDeposit && (
                            <Button 
                                onClick={markAsPaid} 
                                disabled={isUpdatingPayment} 
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm"
                                size="sm"
                            >
                                <CreditCard className="w-4 h-4 mr-2" />
                                {isUpdatingPayment ? 'Updating...' : 'Mark as Paid'}
                            </Button>
                        );
                    })()}
                </div>
                {(() => {
                  const totalAmount = calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0);
                  const depositPaid = rental.deposit_amount || 0;
                  const balanceDue = totalAmount - depositPaid;
                  const damageDeposit = parseFloat(rental?.damage_deposit || 0);
                  const depositToReturn = Math.max(0, damageDeposit - balanceDue);
                  const isBalanceCoveredByDeposit = balanceDue > 0 && rental.deposit_returned_at && Math.abs((damageDeposit - balanceDue) - depositToReturn) < 0.01;
                  
                  if (isBalanceCoveredByDeposit) {
                    return (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        ✓ Balance covered by damage deposit
                      </span>
                    );
                  }
                  return null;
                })()}
                {isPendingApproval && (
                  <span className="text-xs text-yellow-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Payment disabled during price approval
                  </span>
                )}
            </div>
             {rental.signature_url && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-base">Customer Signature</h4>
                <img src={rental.signature_url} alt="Customer Signature" className="h-24 w-auto bg-gray-100 p-2 rounded-md border" />
                <div className="mt-4">
                  <Button 
                    onClick={handlePrintInvoice} 
                    disabled={!canGenerateInvoice}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    title={!canGenerateInvoice ? "Please sign the contract before generating invoice" : "Print Invoice"}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Invoice
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="hidden sm:flex justify-end gap-4">
        {isScheduled && (
          <Button onClick={cancelRental} variant="destructive">
            <XCircle className="w-5 h-5 mr-2" />
            Cancel Booking
          </Button>
        )}
        {isActive && (
          <Button onClick={cancelRental} variant="destructive">
            <XCircle className="w-5 h-5 mr-2" />
            Cancel
          </Button>
        )}
      </div>
      
      {/* Enhanced Opening Video Modal */}
      <Dialog open={openingModalOpen} onOpenChange={(open) => {
        setOpeningModalOpen(open);
        if (!open && isRecording) {
          stopCameraRecording();
        }
      }}>
        <DialogContent className="w-[90vw] max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg pr-8">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Opening Vehicle Condition</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-600">
              Record a video showing the vehicle's condition before handover.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <AlertDescription className="text-xs sm:text-sm text-blue-800">
                Record a video showing the vehicle's condition before handover. Maximum file size: 50MB.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              {!isRecording ? (
                <>
                  <Button 
                    onClick={startCameraRecording}
                    disabled={capturedFiles.length > 0}
                    className="w-full py-3 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white font-medium"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                    Record Video
                  </Button>
                  <Button 
                    onClick={uploadFromGallery} 
                    disabled={isUploading || capturedFiles.length > 0}
                    className="w-full py-3 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                    {isUploading ? 'Uploading...' : 'Choose from Gallery'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={stopCameraRecording}
                  className="w-full py-3 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  <StopCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  Stop Recording
                </Button>
              )}
            </div>

            {/* Camera Preview */}
            {isRecording && (
              <div className="relative bg-black rounded-lg overflow-hidden">
                {/* Hidden video element for stream capture */}
                <video 
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  webkit-playsinline="true"
                  style={{ display: 'none' }}
                />
                
                {/* Visible canvas for rendering */}
                <canvas 
                  ref={canvasRef}
                  className="w-full rounded-lg"
                  style={{ 
                    maxHeight: '400px',
                    backgroundColor: '#000',
                    objectFit: 'contain'
                  }}
                />
                
                {/* Wake-up trigger: invisible moving spinner */}
                <div 
                  className="absolute top-0 left-0 w-1 h-1 opacity-0"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    onClick={toggleTorch}
                    size="sm"
                    className="bg-black/50 hover:bg-black/70"
                  >
                    <Flashlight className={`w-4 h-4 ${torchEnabled ? 'text-yellow-400' : 'text-white'}`} />
                  </Button>
                  <Button
                    onClick={switchCamera}
                    size="sm"
                    className="bg-black/50 hover:bg-black/70"
                    title="Switch Camera"
                  >
                    <svg 
                      className="w-4 h-4 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            )}

            {capturedFiles.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                {capturedFiles.map(file => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-2 sm:p-3 bg-gray-50">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-md overflow-hidden">
                          <video 
                            src={file.url} 
                            className="w-full h-full object-cover"
                            muted
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-1 sm:gap-2 mt-1">
                              <FileVideo className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {file.source}
                              </p>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => removeFile(file.id)} 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setOpeningModalOpen(false);
                  if (isRecording) stopCameraRecording();
                  capturedFiles.forEach(file => URL.revokeObjectURL(file.url));
                  setCapturedFiles([]);
                }}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => saveMedia('opening')} 
                disabled={isProcessingVideo || capturedFiles.length === 0}
                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm sm:text-base"
              >
                {isProcessingVideo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Video
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Enhanced Closing Video Modal */}
      <Dialog open={closingModalOpen} onOpenChange={(open) => {
        setClosingModalOpen(open);
        if (!open && isRecording) {
          stopCameraRecording();
        }
      }}>
        <DialogContent className="w-[90vw] max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg pr-8">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Closing Vehicle Condition</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-600">
              Record a video showing the vehicle's condition upon return.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <AlertDescription className="text-xs sm:text-sm text-blue-800">
                Record a video showing the vehicle's condition upon return. Maximum file size: 50MB.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-2">
              {!isRecording ? (
                <>
                  <Button 
                    onClick={startCameraRecording}
                    disabled={capturedFiles.length > 0}
                    className="w-full py-3 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white font-medium"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                    Record Video
                  </Button>
                  <Button 
                    onClick={uploadFromGallery} 
                    disabled={isUploading || capturedFiles.length > 0}
                    className="w-full py-3 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                    {isUploading ? 'Uploading...' : 'Choose from Gallery'}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={stopCameraRecording}
                  className="w-full py-3 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white font-medium"
                >
                  <StopCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  Stop Recording
                </Button>
              )}
            </div>

            {/* Camera Preview */}
            {isRecording && (
              <div className="relative bg-black rounded-lg overflow-hidden">
                {/* Hidden video element for stream capture */}
                <video 
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  webkit-playsinline="true"
                  style={{ display: 'none' }}
                />
                
                {/* Visible canvas for rendering */}
                <canvas 
                  ref={canvasRef}
                  className="w-full rounded-lg"
                  style={{ 
                    maxHeight: '400px',
                    backgroundColor: '#000',
                    objectFit: 'contain'
                  }}
                />
                
                {/* Wake-up trigger: invisible moving spinner */}
                <div 
                  className="absolute top-0 left-0 w-1 h-1 opacity-0"
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    onClick={toggleTorch}
                    size="sm"
                    className="bg-black/50 hover:bg-black/70"
                  >
                    <Flashlight className={`w-4 h-4 ${torchEnabled ? 'text-yellow-400' : 'text-white'}`} />
                  </Button>
                  <Button
                    onClick={switchCamera}
                    size="sm"
                    className="bg-black/50 hover:bg-black/70"
                    title="Switch Camera"
                  >
                    <svg 
                      className="w-4 h-4 text-white" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            )}

            {capturedFiles.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                {capturedFiles.map(file => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-2 sm:p-3 bg-gray-50">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-md overflow-hidden">
                          <video 
                            src={file.url} 
                            className="w-full h-full object-cover"
                            muted
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-1 sm:gap-2 mt-1">
                              <FileVideo className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {file.source}
                              </p>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => removeFile(file.id)} 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                          >
                            <X className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setClosingModalOpen(false);
                  if (isRecording) stopCameraRecording();
                  capturedFiles.forEach(file => URL.revokeObjectURL(file.url));
                  setCapturedFiles([]);
                }}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => saveMedia('closing')} 
                disabled={isProcessingVideo || capturedFiles.length === 0}
                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm sm:text-base"
              >
                {isProcessingVideo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Save Video
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* End Odometer Prompt Modal */}
      <Dialog open={showEndOdometerPrompt} onOpenChange={setShowEndOdometerPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Gauge className="w-5 h-5 text-blue-600" />
              Enter Ending Odometer Reading
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Please enter the vehicle's odometer reading at the end of the rental.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                Please enter the vehicle's odometer reading at the end of the rental.
                {rental.start_odometer && (
                  <p className="mt-2">
                    <strong>Starting odometer:</strong> {rental.start_odometer} km
                  </p>
                )}
              </AlertDescription>
            </Alert>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ending Odometer (km)
              </label>
              <input
                type="number"
                value={endOdometer}
                onChange={(e) => setEndOdometer(e.target.value)}
                placeholder="Enter ending odometer reading"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={rental.start_odometer || 0}
                step="1"
                autoFocus
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowEndOdometerPrompt(false);
                  setEndOdometer('');
                }}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Skip for Now
              </Button>
              <Button 
                onClick={handleEndOdometerSubmit} 
                disabled={isProcessingEndOdometer || !endOdometer}
                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white order-1 sm:order-2"
              >
                {isProcessingEndOdometer ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Odometer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contract Preview Modal */}
      <Dialog open={contractPreviewModal} onOpenChange={setContractPreviewModal}>
        <DialogContent className="sm:max-w-4xl w-full h-full sm:h-[90vh] p-0 flex flex-col mx-0 sm:mx-4">
          <DialogHeader className="p-4 sm:p-6 pb-3">
      <div className="flex items-center justify-between">
        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <FileText className="w-5 h-5 text-blue-600" />
          Contract Preview
        </DialogTitle>
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden"
          onClick={() => setContractPreviewModal(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <DialogDescription className="text-sm sm:text-base">
        Review before sending to {rental.customer_name}
      </DialogDescription>
          </DialogHeader>

          {/* PDF Preview Area - FIXED SCROLL */}
          <div className="border-y border-gray-200 flex-1 min-h-0">
            <div className="h-full overflow-auto p-2 sm:p-4">
              <div className="bg-white p-3 sm:p-6">
                <div ref={contractTemplateRef}>
                  <ContractTemplate rental={rental} logoUrl={logoUrl} stampUrl={stampUrl} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-6 pt-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Document Status
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Signed: {rental.contract_signed ? '✓ Yes' : '✗ No'}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-green-800 flex items-center gap-1">
                <Smartphone className="w-4 h-4" />
                Send to
              </p>
              <p className="text-sm text-green-600 mt-1">
                {rental.customer_phone}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 pt-0">
            <Button 
              variant="outline" 
              onClick={handlePrintContract}
              className="flex-1"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Contract
            </Button>
            <Button 
              onClick={() => {
                sendContractOnly();
                setContractPreviewModal(false);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <FaWhatsapp className="w-4 h-4 mr-2" />
              Send via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Receipt Preview Modal */}
      <Dialog open={receiptPreviewModal} onOpenChange={setReceiptPreviewModal}>
        <DialogContent className="sm:max-w-4xl w-full h-full sm:h-[90vh] p-0 flex flex-col mx-0 sm:mx-4">
          <DialogHeader className="p-4 sm:p-6 pb-3">
      <div className="flex items-center justify-between">
        <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">

          <Receipt className="w-5 h-5 text-purple-600" />
          Receipt Preview
        </DialogTitle>
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden"
          onClick={() => setReceiptPreviewModal(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      <DialogDescription className="text-sm sm:text-base">
        Review payment details before sending to {rental.customer_name}
      </DialogDescription>
          </DialogHeader>

          {/* PDF Preview Area - FIXED SCROLL */}
          <div className="border-y border-gray-200 flex-1 min-h-0">
            <div className="h-full overflow-auto p-2 sm:p-4">
              <div className="bg-white p-3 sm:p-6">
                <div ref={receiptTemplateRef}>
                  <ReceiptTemplate rental={rental} logoUrl={logoUrl} stampUrl={stampUrl} />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-6 pt-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-purple-800 flex items-center gap-1">
                <CreditCard className="w-4 h-4" />
                Payment Status
              </p>
              <p className="text-sm text-purple-600 mt-1">
                Status: {rental.payment_status === 'paid' ? '✓ Paid' : 'Pending'}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-green-800 flex items-center gap-1">
                <Smartphone className="w-4 h-4" />
                Send to
              </p>
              <p className="text-sm text-green-600 mt-1">
                {rental.customer_phone}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 sm:p-6 pt-0">
            <Button 
              variant="outline" 
              onClick={handlePrintInvoice}
              className="flex-1"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
            <Button 
              onClick={() => {
                sendReceiptOnly();
                setReceiptPreviewModal(false);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <FaWhatsapp className="w-4 h-4 mr-2" />
              Send via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Send Modal */}
      <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaWhatsapp className="text-green-600" />
              Send via WhatsApp
            </DialogTitle>
            <DialogDescription>
              Select items to send to {rental.customer_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {/* Contract Box */}
            <div 
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${whatsappOptions.contract ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setWhatsappOptions({...whatsappOptions, contract: !whatsappOptions.contract})}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${whatsappOptions.contract ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'}`}>
                    {whatsappOptions.contract && <FaCheck className="text-white text-xs" />}
                  </div>
                  <div>
                    <p className="font-medium">Rental Contract</p>
                    <p className="text-sm text-gray-500">PDF document with terms and conditions</p>
                  </div>
                </div>
                <FaFilePdf className="text-red-500" />
              </div>
            </div>
            
            {/* Receipt Box */}
            <div 
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${whatsappOptions.receipt ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setWhatsappOptions({...whatsappOptions, receipt: !whatsappOptions.receipt})}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${whatsappOptions.receipt ? 'bg-green-500 border-green-500' : 'bg-white border-gray-400'}`}>
                    {whatsappOptions.receipt && <FaCheck className="text-white text-xs" />}
                  </div>
                  <div>
                    <p className="font-medium">Payment Receipt</p>
                    <p className="text-sm text-gray-500">Transaction details and payment confirmation</p>
                  </div>
                </div>
                <FaFileInvoice className="text-green-500" />
              </div>
            </div>
            
            {/* Opening Video Box */}
            <div 
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${whatsappOptions.openingVideo ? 'bg-purple-50 border-purple-400' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setWhatsappOptions({...whatsappOptions, openingVideo: !whatsappOptions.openingVideo})}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${whatsappOptions.openingVideo ? 'bg-purple-500 border-purple-500' : 'bg-white border-gray-400'}`}>
                    {whatsappOptions.openingVideo && <FaCheck className="text-white text-xs" />}
                  </div>
                  <div>
                    <p className="font-medium">Opening Video</p>
                    <p className="text-sm text-gray-500">Vehicle condition at rental start</p>
                  </div>
                </div>
                <FaVideo className="text-purple-500" />
              </div>
            </div>
            
            {/* Closing Video Box */}
            <div 
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${whatsappOptions.closingVideo ? 'bg-amber-50 border-amber-400' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setWhatsappOptions({...whatsappOptions, closingVideo: !whatsappOptions.closingVideo})}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${whatsappOptions.closingVideo ? 'bg-amber-500 border-amber-500' : 'bg-white border-gray-400'}`}>
                    {whatsappOptions.closingVideo && <FaCheck className="text-white text-xs" />}
                  </div>
                  <div>
                    <p className="font-medium">Closing Video</p>
                    <p className="text-sm text-gray-500">Vehicle condition at return</p>
                  </div>
                </div>
                <FaVideo className="text-amber-500" />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setWhatsappModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              onClick={async () => {
                setIsSharing(true);
                try {
                  const contractUrl = whatsappOptions.contract ? await generateContractPDF() : null;
                  const receiptUrl = whatsappOptions.receipt ? await generateReceiptPDF() : null;
                  
                  const videoUrls = [];
                  if (whatsappOptions.openingVideo && openingMedia.length > 0) {
                    const latestOpening = openingMedia[0];
                    if (latestOpening.public_url) videoUrls.push(`Opening Video: ${latestOpening.public_url}`);
                  }
                  if (whatsappOptions.closingVideo && closingMedia.length > 0) {
                    const latestClosing = closingMedia[0];
                    if (latestClosing.public_url) videoUrls.push(`Closing Video: ${latestClosing.public_url}`);
                  }
                  
                  let message = `Hi ${rental.customer_name}!\n\nYour rental documents:\n`;
                  if (contractUrl) message += `Contract: ${contractUrl}\n`;
                  if (receiptUrl) message += `Receipt: ${receiptUrl}\n`;
                  if (videoUrls.length > 0) {
                    message += `\nVideos:\n${videoUrls.join('\n')}`;
                  }
                  message += `\n\nThank you!`;
                  
                  const encodedMessage = encodeURIComponent(message);
                  const whatsappUrl = `https://wa.me/${rental.customer_phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
                  window.location.href = whatsappUrl;
                  
                  setWhatsappOptions({
                    contract: true,
                    receipt: true,
                    openingVideo: false,
                    closingVideo: false
                  });
                  setWhatsappModalOpen(false);
                } catch (error) {
                  console.error('Error sending WhatsApp:', error);
                  alert(`Failed to share via WhatsApp. Error: ${error.message}`);
                } finally {
                  setIsSharing(false);
                }
              }}
            >
              <FaWhatsapp size={18} />
              Send via WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>




      <SignaturePadModal
        isOpen={isSigning}
        onClose={() => setIsSigning(false)}
        onSave={handleSignatureSave}
      />

      <SignaturePadModal
        isOpen={showDepositSignatureModal}
        onClose={() => setShowDepositSignatureModal(false)}
        onSave={handleDepositSignatureSave}
        title="Damage Deposit Return Authorization"
        description={(() => {
          const depositCalc = calculateDepositReturn();
          if (deductFromDeposit && depositCalc.hasDeduction) {
            return `I confirm receipt of ${depositCalc.depositReturn.toFixed(2)} MAD as damage deposit return.

Breakdown:
• Original Deposit: ${depositCalc.damageDeposit.toFixed(2)} MAD
• Less: Unpaid Balance: ${depositCalc.balanceDue.toFixed(2)} MAD
• Net Return: ${depositCalc.depositReturn.toFixed(2)} MAD${depositCalc.additionalOwed > 0 ? `

⚠️ Note: Additional ${depositCalc.additionalOwed.toFixed(2)} MAD is still owed.` : ''}`;
          } else {
            return `I confirm receipt of ${depositCalc.depositReturn.toFixed(2)} MAD as full damage deposit return.`;
          }
        })()}
      />

      <ViewCustomerDetailsDrawer
        isOpen={customerDetailsDrawer.isOpen}
        onClose={() => setCustomerDetailsDrawer({ isOpen: false, customerId: null, rental: null })}
        customerId={customerDetailsDrawer.customerId}
        rental={rental}
      />

      <SecondDriverDetailsModal
        isOpen={secondDriverModalOpen}
        onClose={() => setSecondDriverModalOpen(false)}
        rental={rental}
      />

      <ExtensionRequestModal
        isOpen={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        rental={rental}
        onExtensionCreated={handleExtensionCreated}
        currentUser={currentUser}
      />

      <div className="fixed inset-0 pointer-events-none opacity-0 z-[-1]" aria-hidden="true">
        <div ref={contractRef}>
            <RentalContract rental={rental} />
        </div>
        <div ref={invoiceRef}>
            {rental && <InvoiceTemplate rental={formattedRentalForInvoice} logoUrl={logoUrl} stampUrl={stampUrl} />}
        </div>
        <div ref={contractTemplateRef} className="absolute">
          <ContractTemplate rental={rental} logoUrl={logoUrl} stampUrl={stampUrl} />
        </div>
        <div ref={receiptTemplateRef} className="absolute">
          <ReceiptTemplate rental={rental} logoUrl={logoUrl} stampUrl={stampUrl} />
        </div>

      </div>

      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2 z-10 flex flex-col gap-2">
        <div className="flex justify-center gap-2">
          {isScheduled && (
            <Button onClick={cancelRental} variant="destructive" className="flex-1">
              <XCircle className="w-4 h-4 mr-1" /> Cancel
            </Button>
          )}
          {isActive && (
            <Button onClick={cancelRental} variant="destructive" className="flex-1">
              <XCircle className="w-4 h-4 mr-1" /> Cancel
            </Button>
          )}
        </div>
        <div className="flex justify-center gap-2">
          {!rental.contract_signed && !rental.signature_url && rental.rental_status !== 'completed' && (
            <Button 
              onClick={() => setIsSigning(true)} 
              disabled={!canSignContract}
              className="flex-1"
              title={!hasOpeningVideo ? "Upload opening video first" : "Sign contract"}
            >
              <FileSignature className="w-4 h-4 mr-1" />
              Sign
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1 mb-2">
          <Button
            onClick={() => setContractPreviewModal(true)}
            disabled={!canSendContract}
            className="text-xs py-2 h-auto bg-blue-600 text-white"
            size="sm"
            title="Send contract only"
          >
            {isGeneratingContract ? '...' : 'Contract'}
          </Button>
          <Button
            onClick={() => setReceiptPreviewModal(true)}
            disabled={!canSendReceipt}
            className="text-xs py-2 h-auto bg-purple-600 text-white"
            size="sm"
            title="Send receipt only"
          >
            {isGeneratingReceipt ? '...' : 'Receipt'}
          </Button>
          <Button
            onClick={() => setWhatsappModalOpen(true)}
            disabled={!canSendBoth}
            className="text-xs py-2 h-auto bg-green-600 text-white hover:bg-green-700"
            size="sm"
            title="Send both documents via WhatsApp"
          >
            <FaWhatsapp size={12} className="mr-1" />
            WhatsApp
          </Button>
        </div>
                <div className="flex gap-2">
            {(() => {
                const totalAmount = calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0);
                const depositPaid = rental.deposit_amount || 0;
                const balanceDue = totalAmount - depositPaid;
                const damageDeposit = parseFloat(rental?.damage_deposit || 0);
                const depositToReturn = Math.max(0, damageDeposit - balanceDue);
                
                // Hide button if balance is covered by damage deposit deduction
                const isBalanceCoveredByDeposit = balanceDue > 0 && rental.deposit_returned_at && Math.abs((damageDeposit - balanceDue) - depositToReturn) < 0.01;
                
                return rental.payment_status?.toLowerCase() !== 'paid' && !isPendingApproval && !isBalanceCoveredByDeposit && (
                <Button 
                    onClick={markAsPaid} 
                    disabled={isUpdatingPayment} 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                    <CreditCard className="w-4 h-4 mr-1" />
                    {isUpdatingPayment ? '...' : 'Paid'}
                </Button>
                );
            })()}
            {(() => {
                const totalAmount = calculateRentalBaseAmount() + (rental.overage_charge || 0) + (totalExtensionFees || 0);
                const depositPaid = rental.deposit_amount || 0;
                const balanceDue = totalAmount - depositPaid;
                const damageDeposit = parseFloat(rental?.damage_deposit || 0);
                const depositToReturn = Math.max(0, damageDeposit - balanceDue);
                const isBalanceCoveredByDeposit = balanceDue > 0 && rental.deposit_returned_at && Math.abs((damageDeposit - balanceDue) - depositToReturn) < 0.01;
                
                if (isBalanceCoveredByDeposit) {
                  return (
                    <span className="text-sm text-green-600 flex items-center justify-center gap-1 w-full">
                      <CheckCircle className="w-4 h-4" />
                      ✓ Balance covered by damage deposit
                    </span>
                  );
                }
                return null;
            })()}
            {/* Mobile Preview Buttons */}
<div className="grid grid-cols-3 gap-1 mb-2">
  <Button
    onClick={() => setContractPreviewModal(true)}
    disabled={!rental.signature_url}
    className="text-xs py-2 h-auto"
    size="sm"
  >
    <FileText className="w-3 h-3 mr-1" />
    Contract
  </Button>
  <Button
    onClick={() => setReceiptPreviewModal(true)}
    disabled={rental.payment_status !== 'paid'}
    className="text-xs py-2 h-auto"
    size="sm"
  >
    <Receipt className="w-3 h-3 mr-1" />
    Receipt
  </Button>
</div>
        </div>
      </div>
    </div>
  );
}
