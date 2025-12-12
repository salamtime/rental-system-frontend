import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
import RentalVideos from '../../components/RentalVideos';
import ViewCustomerDetailsDrawer from '../../components/admin/ViewCustomerDetailsDrawer';
import RentalContract from '../../components/admin/RentalContract'; // Import the contract component
import SignaturePadModal from '../../components/SignaturePadModal'; // Import the signature modal
import { useReactToPrint } from 'react-to-print';
import { getPaymentStatusStyle } from '../../config/statusColors';
import { 
  ArrowLeft, 
  Printer, 
  X, 
  Upload, 
  Play, 
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  PlayCircle,
  Maximize2,
  User,
  CreditCard,
  FileSignature
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import InvoiceTemplate from '../../components/InvoiceTemplate';

export default function RentalDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [elapsedTime, setElapsedTime] = useState('');
  
  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [closingModalOpen, setClosingModalOpen] = useState(false);
  
  const [capturedFiles, setCapturedFiles] = useState([]);
  
  const [openingMedia, setOpeningMedia] = useState([]);
  const [closingMedia, setClosingMedia] = useState([]);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  
  const [isSigning, setIsSigning] = useState(false); // State for signature modal
  const [isSharing, setIsSharing] = useState(false); // State for WhatsApp sharing

  const [logoUrl, setLogoUrl] = useState(null);
  const [stampUrl, setStampUrl] = useState(null);

  const [customerDetailsDrawer, setCustomerDetailsDrawer] = useState({
    isOpen: false,
    customerId: null,
    rental: null
  });

  const [isFindingSecondDriver, setIsFindingSecondDriver] = useState(false);

  const contractRef = useRef();
  const invoiceRef = useRef();
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

  const handleShareViaWhatsApp = async () => {
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
      } else if (rental.public_url) {
        videoUrl = rental.public_url;
      }

      const cacheBuster = `?v=${new Date().getTime()}`;
      const invoiceUrlWithCacheBust = `${invoiceUrl}${cacheBuster}`;
      const videoUrlWithCacheBust = videoUrl !== 'Not available' ? `${videoUrl}${cacheBuster}` : 'Not available';

      const message = `Hello ${rental.customer_name},\n\nPlease find your rental documents below:\n\nInvoice: ${invoiceUrlWithCacheBust}\nVehicle Video: ${videoUrlWithCacheBust}\n\nThank you for choosing our service!`;
      
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${rental.customer_phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;

      window.open(whatsappUrl, '_blank');

    } catch (err) {
      console.error('❌ Error sharing via WhatsApp:', err);
      alert(`Failed to share via WhatsApp. Error: ${err.message}`);
    } finally {
      setIsSharing(false);
    }
  };

  const isPaymentSufficient = () => {
    const status = rental?.payment_status?.toLowerCase();
    return status === 'paid';
  };

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
      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          payment_status: 'paid',
          deposit_amount: rental.total_amount, // Fix: Ensure data consistency
          remaining_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id)
        .select(`
            *,
            vehicle:saharax_0u4w4d_vehicles(
              id,
              name,
              model,
              plate_number,
              vehicle_type
            )
          `)
        .single();

      if (error) throw error;

      setRental(data);
      alert('✅ Payment status updated to "Paid"!');
      
    } catch (err) {
      console.error('❌ Error marking as paid:', err);
      alert(`Failed to update payment status. Error: ${err.message}`);
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
        .select('*, vehicle:saharax_0u4w4d_vehicles(*)')
        .single();
      if (error) throw error;
      setRental(data);
      alert('✅ Contract signed and signature saved!');
    } catch (err) {
      console.error('❌ Error saving signature:', err);
      alert(`Failed to save signature. Error: ${err.message}`);
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
        console.error('Error loading media records:', mediaError);
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
      console.error('Error loading rental media:', err);
    }
  };

  useEffect(() => {
    const loadRental = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('app_4c3a7a6153_rentals')
          .select(`
            *,
            customer_id_image,
            second_driver_customer_id,
            vehicle:saharax_0u4w4d_vehicles(*),
            customer:app_4c3a7a6153_customers(id, id_scan_url)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        let rentalData = data;

        // Correct payment status logic
        const deposit = parseFloat(rentalData.deposit_amount) || 0;
        const total = parseFloat(rentalData.total_amount) || 0;
        
        if (rentalData.payment_status !== 'overdue') {
            if (total > 0) {
                if (deposit <= 0) {
                    rentalData.payment_status = 'unpaid';
                } else if (deposit >= total) {
                    rentalData.payment_status = 'paid';
                } else {
                    rentalData.payment_status = 'partial';
                }
            } else {
                rentalData.payment_status = 'unpaid';
            }
        }

        setRental(rentalData);
        await loadRentalMedia(rentalData.id);
        
      } catch (err) {
        console.error('❌ Error loading rental:', err);
        setError('Failed to load rental details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadRental();
    }
  }, [id]);

  useEffect(() => {
    const findSecondDriver = async () => {
      if (rental && rental.second_driver_name && !rental.second_driver_customer_id) {
        setIsFindingSecondDriver(true);
        try {
          let customer = null;
          // Try to find by license first
          if (rental.second_driver_license) {
            const { data: customerByLicense, error: licenseError } = await supabase
              .from('app_4c3a7a6153_customers')
              .select('id')
              .eq('license_number', rental.second_driver_license)
              .single();
            if (licenseError && licenseError.code !== 'PGRST116') { // PGRST116: no rows returned
              console.error('Error finding customer by license:', licenseError);
            }
            if (customerByLicense) {
              customer = customerByLicense;
            }
          }

          // If not found by license, try by name
          if (!customer && rental.second_driver_name) {
            const { data: customerByName, error: nameError } = await supabase
              .from('app_4c3a7a6153_customers')
              .select('id')
              .eq('full_name', rental.second_driver_name)
              .single();
            if (nameError && nameError.code !== 'PGRST116') {
              console.error('Error finding customer by name:', nameError);
            }
            if (customerByName) {
              customer = customerByName;
            }
          }

          if (customer) {
            setRental(prev => ({ ...prev, second_driver_customer_id: customer.id }));
            // Also update the rental record in the database
            await supabase
              .from('app_4c3a7a6153_rentals')
              .update({ second_driver_customer_id: customer.id })
              .eq('id', rental.id);
          }
        } catch (err) {
          console.error("Failed to find second driver's customer record:", err);
        } finally {
          setIsFindingSecondDriver(false);
        }
      }
    };

    findSecondDriver();
  }, [rental]);

  useEffect(() => {
    if (!rental?.rental_end_date || rental.rental_status !== 'active') return;

    const interval = setInterval(() => {
      const now = new Date();
      const endDate = new Date(rental.rental_end_date);
      const diff = endDate - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeRemaining(`${hours}h ${minutes}m`);
    }, 60000);
    return () => clearInterval(interval);
  }, [rental]);

  useEffect(() => {
    if (!rental?.started_at || rental.rental_status !== 'active') {
      setElapsedTime('');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const startDate = new Date(rental.started_at);
      const diff = now - startDate;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [rental]);

  const uploadFromGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = false;
    
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      input.setAttribute('capture', 'camera');
    }
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) {
        alert('File size too large. Please choose a video under 50MB.');
        return;
      }

      if (!file.type.startsWith('video/')) {
        alert('Please select a video file.');
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const fileObj = {
          id: Date.now() + Math.random(),
          type: 'video',
          blob: file,
          url: URL.createObjectURL(file),
          name: file.name,
          timestamp: new Date().toISOString(),
          duration: 0,
          size: file.size
        };
        
        setCapturedFiles(prev => [...prev, fileObj]);
        setIsUploading(false);
      } catch (err) {
        console.error('❌ Upload failed:', err);
        alert('Upload failed. Please try again.');
        setIsUploading(false);
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

  const saveMedia = async (phase) => {
    const videoFile = capturedFiles.find(file => file.type === 'video');
    if (!videoFile) {
      alert(`Please upload a video for ${phase} documentation.`);
      return;
    }

    try {
      setIsProcessingVideo(true);
      
      const timestamp = Date.now();
      const fileExtension = videoFile.name.split('.').pop() || 'mp4';
      const filename = `${rental.id}/${timestamp}_${phase}_inspection.${fileExtension}`;
      const bucketName = `rental-media-${phase}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filename, videoFile.blob, { upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filename);

      const mediaRecord = {
        rental_id: rental.id,
        file_name: filename,
        original_filename: videoFile.name,
        file_type: videoFile.blob.type,
        file_size: videoFile.blob.size,
        phase: phase === 'opening' ? 'out' : 'in',
        storage_path: uploadData.path,
        public_url: urlData.publicUrl,
        uploaded_at: new Date().toISOString(),
      };

      const { error: mediaError } = await supabase.from('app_2f7bf469b0_rental_media').insert(mediaRecord);
      if (mediaError) throw new Error(`Failed to save media record: ${mediaError.message}`);

      let rentalUpdate = {};
      if(phase === 'opening') {
          rentalUpdate = { rental_status: 'active', started_at: new Date().toISOString() };
      } else {
          rentalUpdate = { rental_status: 'completed', completed_at: new Date().toISOString() };
      }
      
      const { data: updatedRental, error: rentalError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update(rentalUpdate)
        .eq('id', rental.id)
        .select('*, vehicle:saharax_0u4w4d_vehicles(*)')
        .single();
      
      if (rentalError) throw new Error(`Failed to update rental: ${rentalError.message}`);

      await loadRentalMedia(rental.id);
      alert(`${phase.charAt(0).toUpperCase() + phase.slice(1)} video saved successfully!`);
      
      capturedFiles.forEach(file => URL.revokeObjectURL(file.url));
      setCapturedFiles([]);
      if(phase === 'opening') setOpeningModalOpen(false);
      if(phase === 'closing') setClosingModalOpen(false);
      setRental(updatedRental);

    } catch (error) {
      console.error(`❌ Error saving ${phase} video:`, error);
      alert(error.message || `Failed to save ${phase} video`);
    } finally {
      setIsProcessingVideo(false);
    }
  };

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
      const { data: updatedRental, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({ rental_status: 'active', started_at: new Date().toISOString() })
        .eq('id', rental.id)
        .select('*, vehicle:saharax_0u4w4d_vehicles(*)')
        .single();

      if (error) throw error;
      
      alert('✅ Rental started successfully!');
      setRental(updatedRental);
      
    } catch (err) {
      console.error('Error starting rental:', err);
      alert('Failed to start rental. Please try again.');
    }
  };

  const completeRental = async () => {
    if (closingMedia.length === 0) {
      setClosingModalOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({ rental_status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', rental.id);

      if (error) throw error;
      
      alert('Rental completed successfully!');
      navigate('/admin/rentals');
    } catch (err) {
      console.error('Error completing rental:', err);
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
        
        alert('Rental cancelled successfully!');
        navigate('/admin/rentals');
      } catch (err) {
        console.error('Error cancelling rental:', err);
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

  const handleSecondDriverDetailsClick = () => {
    if (isFindingSecondDriver) {
        alert("Still searching for the second driver's record. Please wait a moment.");
        return;
    }
    if (rental.second_driver_customer_id) {
        handleViewCustomerDetails(rental.second_driver_customer_id);
    } else {
        alert("Could not automatically locate the second driver's customer record. Please check the customer list manually.");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen"><p>{error}</p></div>;
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
  const canStartRental = isPaymentSufficient();

  const formattedRentalForInvoice = {
    ...rental,
    customer_license_number: rental.linked_display_id,
    vehicle_details: rental.vehicle,
    start_date: rental.rental_start_date ? new Date(rental.rental_start_date).toLocaleString() : 'N/A',
    end_date: rental.rental_end_date ? new Date(rental.rental_end_date).toLocaleString() : 'N/A',
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl pb-40 sm:pb-8">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={() => navigate('/admin/rentals')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rentals
        </Button>
        <div className="hidden sm:flex gap-2">
            <Button onClick={handlePrintContract} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print Contract
            </Button>
            <Button onClick={handlePrintInvoice} className="bg-blue-600 text-white hover:bg-blue-700">
              <Printer className="w-4 h-4 mr-2" />
              Print Invoice
            </Button>
            <Button onClick={() => setIsSigning(true)} disabled={rental.contract_signed || !!rental.signature_url}>
                <FileSignature className="w-4 h-4 mr-2" />
                {rental.contract_signed || !!rental.signature_url ? 'Contract Signed' : 'Sign Contract'}
            </Button>
            {rental?.customer_phone && (
              <Button onClick={handleShareViaWhatsApp} disabled={isSharing} className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2">
                  <FaWhatsapp size={18} />
                  {isSharing ? 'Sharing...' : 'Share via WhatsApp'}
              </Button>
            )}
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-lg sm:text-xl">
            <span className="mb-2 sm:mb-0">{rental.vehicle?.name} - {rental.vehicle?.model}</span>
            <Badge className={`${getStatusColor(rental.rental_status)} self-start sm:self-center`}>{rental.rental_status?.toUpperCase()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isActive && (
            <div className="grid grid-cols-2 gap-4 text-center my-4">
              <div>
                <p className="text-2xl font-bold text-green-600">{elapsedTime}</p>
                <p className="text-sm text-gray-600">Time Elapsed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{timeRemaining}</p>
                <p className="text-sm text-gray-600">Time Remaining</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {(isScheduled || isActive || isCompleted) && (
        <div className="mb-6">
          <RentalVideos rental={rental} onUpdate={() => loadRentalMedia(rental.id)} isProcessing={isProcessingVideo} />
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
              <p><strong>ID/License:</strong> {rental.linked_display_id || 'N/A'}</p>
            </div>
          </div>
          {rental.second_driver_name && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 text-lg">Second Driver Details</h3>
                <Button
                  onClick={handleSecondDriverDetailsClick}
                  size="sm"
                  className="bg-blue-100 text-blue-800 hover:bg-blue-200"
                >
                  <User className="w-4 h-4 mr-2" />
                  {isFindingSecondDriver ? 'Finding...' : 'View Details'}
                </Button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2 text-sm sm:text-base">
                  <p><strong>Full Name:</strong> {rental.second_driver_name}</p>
                  <p><strong>License:</strong> {rental.second_driver_license || 'N/A'}</p>
                </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm sm:text-base">
              <p><strong>Total Amount:</strong> {rental.total_amount} MAD</p>
              <p><strong>Deposit Amount:</strong> {rental.deposit_amount || 0} MAD</p>
              <p className="font-bold text-red-600"><strong>Remaining Due:</strong> {rental.remaining_amount || 0} MAD</p>
              <p><strong>Damage Deposit:</strong> {rental.damage_deposit || 0} MAD</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
                <strong>Payment Status:</strong> 
                {getPaymentStatusBadge(rental.payment_status)}
                {rental.payment_status?.toLowerCase() !== 'paid' && (
                    <Button 
                        onClick={markAsPaid} 
                        disabled={isUpdatingPayment} 
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-sm"
                        size="sm"
                    >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {isUpdatingPayment ? 'Updating...' : 'Mark as Paid'}
                    </Button>
                )}
            </div>
             <p className="mt-2 text-sm sm:text-base"><strong>Contract Signed:</strong> {rental.contract_signed || !!rental.signature_url ? 'Yes' : 'No'}</p>
             {rental.signature_url && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2 text-base">Customer Signature</h4>
                <img src={rental.signature_url} alt="Customer Signature" className="h-24 w-auto bg-gray-100 p-2 rounded-md border" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="hidden sm:flex justify-end gap-4">
        {isScheduled && (
          <>
            <div className="flex items-center gap-2">
                <Button onClick={startRental} disabled={!canStartRental} className={!canStartRental ? 'bg-gray-300' : 'bg-green-600 hover:bg-green-700 text-white'}>
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Start Now
                </Button>
            </div>
            <Button onClick={cancelRental} variant="destructive">
              <XCircle className="w-5 h-5 mr-2" />
              Cancel Booking
            </Button>
          </>
        )}
        {isActive && (
          <>
            <Button onClick={completeRental} className="bg-blue-600 hover:bg-blue-700 text-white">
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete Now
            </Button>
            <Button onClick={cancelRental} variant="destructive">
              <XCircle className="w-5 h-5 mr-2" />
              Cancel
            </Button>
          </>
        )}
      </div>
      
      <Dialog open={openingModalOpen} onOpenChange={setOpeningModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Opening Vehicle Condition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Button onClick={uploadFromGallery} disabled={isUploading}><Upload className="w-4 h-4 mr-2" /> Upload Video</Button>
            {capturedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between">
                <span>{file.name}</span>
                <Button onClick={() => removeFile(file.id)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpeningModalOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMedia('opening')} disabled={isProcessingVideo || capturedFiles.length === 0}>{isProcessingVideo ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={closingModalOpen} onOpenChange={setClosingModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Closing Vehicle Condition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Button onClick={uploadFromGallery} disabled={isUploading}><Upload className="w-4 h-4 mr-2" /> Upload Video</Button>
            {capturedFiles.map(file => (
              <div key={file.id} className="flex items-center justify-between">
                <span>{file.name}</span>
                <Button onClick={() => removeFile(file.id)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setClosingModalOpen(false)}>Cancel</Button>
              <Button onClick={() => saveMedia('closing')} disabled={isProcessingVideo || capturedFiles.length === 0}>{isProcessingVideo ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SignaturePadModal
        isOpen={isSigning}
        onClose={() => setIsSigning(false)}
        onSave={handleSignatureSave}
      />

      <ViewCustomerDetailsDrawer
        isOpen={customerDetailsDrawer.isOpen}
        onClose={() => setCustomerDetailsDrawer({ isOpen: false, customerId: null, rental: null })}
        customerId={customerDetailsDrawer.customerId}
        rental={rental}
      />
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={contractRef}>
            <RentalContract rental={rental} />
        </div>
        <div ref={invoiceRef}>
            {rental && <InvoiceTemplate rental={formattedRentalForInvoice} logoUrl={logoUrl} stampUrl={stampUrl} />}
        </div>
      </div>

      {/* --- STICKY FOOTER FOR MOBILE --- */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2 z-10 flex flex-col gap-2">
        {/* Action Buttons */}
        <div className="flex justify-center gap-2">
          {isScheduled && (
            <>
              <Button onClick={startRental} disabled={!canStartRental} className={`flex-1 ${!canStartRental ? 'bg-gray-300' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                <PlayCircle className="w-4 h-4 mr-1" /> Start
              </Button>
              <Button onClick={cancelRental} variant="destructive" className="flex-1">
                <XCircle className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </>
          )}
          {isActive && (
            <>
              <Button onClick={completeRental} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle className="w-4 h-4 mr-1" /> Complete
              </Button>
              <Button onClick={cancelRental} variant="destructive" className="flex-1">
                <XCircle className="w-4 h-4 mr-1" /> Cancel
              </Button>
            </>
          )}
        </div>
        {/* Document & Payment Buttons */}
        <div className="flex justify-center gap-2">
          <Button onClick={handlePrintContract} variant="outline" className="flex-1">
            <Printer className="w-4 h-4 mr-1" />
            Contract
          </Button>
          <Button onClick={handlePrintInvoice} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-1" />
            Invoice
          </Button>
          <Button 
            onClick={() => setIsSigning(true)} 
            disabled={rental.contract_signed || !!rental.signature_url}
            className="flex-1"
          >
            <FileSignature className="w-4 h-4 mr-1" />
            {rental.contract_signed || !!rental.signature_url ? 'Signed' : 'Sign'}
          </Button>
        </div>
        <div className="flex gap-2">
            {rental.payment_status?.toLowerCase() !== 'paid' && (
                <Button 
                    onClick={markAsPaid} 
                    disabled={isUpdatingPayment} 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                    <CreditCard className="w-4 h-4 mr-1" />
                    {isUpdatingPayment ? '...' : 'Paid'}
                </Button>
            )}
            {rental?.customer_phone && (
              <Button onClick={handleShareViaWhatsApp} disabled={isSharing} className="flex-1 bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2">
                  <FaWhatsapp size={16} />
                  {isSharing ? '...' : 'Share'}
              </Button>
            )}
        </div>
      </div>
    </div>
  );
}