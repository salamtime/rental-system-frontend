import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import InvoiceTemplate from "@/components/InvoiceTemplate";
import { supabase } from "../../utils/supabaseClient";

// Helper function to format dates and times
const formatRentalDates = (rental) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        // Use en-US for MM/DD/YYYY format
        return new Date(dateString).toLocaleDateString('en-US');
    };

    const formatDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return 'N/A';
        
        const datePart = dateStr.split('T')[0];
        const combinedDateTimeStr = `${datePart}T${timeStr}`;
        const date = new Date(combinedDateTimeStr);
        
        if (isNaN(date.getTime())) return 'N/A';

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    let startDate = '';
    let endDate = '';

    if (rental.rental_type === 'hourly') {
        startDate = formatDateTime(rental.rental_start_date, rental.rental_start_time);
        endDate = rental.rental_end_date && rental.rental_end_time 
            ? formatDateTime(rental.rental_end_date, rental.rental_end_time)
            : 'Ongoing';
    } else { // For 'daily' or 'weekly'
        startDate = formatDate(rental.rental_start_date);
        endDate = rental.rental_end_date ? formatDate(rental.rental_end_date) : 'Ongoing';
    }

    return { startDate, endDate };
};


export default function InvoicePage() {
  const { id } = useParams();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No rental ID provided.");
      return;
    }

    async function fetchRentalData() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("app_4c3a7a6153_rentals")
          .select(`
            *,
            vehicle:saharax_0u4w4d_vehicles(name, plate_number),
            customer:app_4c3a7a6153_customers(nationality)
          `)
          .eq("id", id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          throw new Error("Rental not found.");
        }

        const { startDate, endDate } = formatRentalDates(data);
        const customerInfo = data.customer;

        const rentalDataForTemplate = {
            start_date: startDate,
            end_date: endDate,
            customer_name: data.customer_name || '',
            customer_email: data.customer_email || '',
            customer_phone: data.customer_phone || '',
            customer_license_number: data.customer_licence_number || '',
            nationality: customerInfo ? customerInfo.nationality : null,
            vehicle_details: data.vehicle ? { 
                name: data.vehicle.name || '',
                plate_number: data.vehicle.plate_number || '' 
            } : { name: '', plate_number: '' },
            signature_url: data.signature_url || '',
            ...data
        };
        
        // Clean up the joined object to avoid confusion
        delete rentalDataForTemplate.vehicle;
        delete rentalDataForTemplate.customer;

        setRental(rentalDataForTemplate);
      } catch (err) {
        console.error("Error loading rental data:", err);
        setError(`Failed to load rental information: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchRentalData();
  }, [id]);

  useEffect(() => {
    // Trigger print dialog once rental data is loaded
    if (rental && !loading && !error) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [rental, loading, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        Loading invoice...
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        {error || "Could not find rental information."}
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center print:bg-white">
      <InvoiceTemplate rental={rental} />
    </div>
  );
}