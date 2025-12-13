import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { supabase } from "../../utils/supabaseClient";

// Helper function to format rental periods
const formatRentalPeriod = (rental) => {
    const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('en-CA') : null;
    const formatTime = (timeStr) => timeStr ? timeStr.substring(0, 5) : null;

    if (rental.rental_type === 'hourly') {
        const startDate = formatDate(rental.rental_start_date);
        const startTime = formatTime(rental.rental_start_time);
        const endDate = formatDate(rental.rental_end_date);
        const endTime = formatTime(rental.rental_end_time);
        const startDateTime = startDate && startTime ? `${startDate} ${startTime}` : 'N/A';
        const endDateTime = endDate && endTime ? `${endDate} ${endTime}` : 'Ongoing';
        return `${startDateTime} - ${endDateTime}`;
    } else {
        const startDate = formatDate(rental.rental_start_date);
        const endDate = rental.rental_end_date ? formatDate(rental.rental_end_date) : 'Ongoing';
        return startDate === 'N/A' ? 'N/A' : `${startDate} to ${endDate}`;
    }
};

// Helper function to format the rental ID
const formatRentalId = (id) => {
    if (!id) return 'N/A';
    const year = new Date().getFullYear();
    const idSnippet = id.split('-')[0];
    return `RNT-${year}-${idSnippet}`;
};

export default function RentalList() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRentals() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from("app_4c3a7a6153_rentals")
          .select(`
            id,
            customer_name,
            rental_start_date,
            rental_start_time,
            rental_end_date,
            rental_end_time,
            rental_type,
            total_amount: total_cost,
            rental_status: status,
            payment_status,
            vehicle:saharax_0u4w4d_vehicles(id, name, plate_number)
          `)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setRentals(data || []);
      } catch (err) {
        setError(err.message);
        console.error("Error fetching rentals:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRentals();
  }, []);

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "confirmed":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "scheduled":
        return "outline";
      default:
        return "outline";
    }
  };
  
    const getPaymentStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "default";
      case "partial":
        return "secondary";
      case "unpaid":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) return <div className="text-center py-10">Loading rentals...</div>;
  if (error) return <div className="text-center py-10 text-red-600">Error: {error}</div>;

  return (
    <div className="border rounded-lg w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rental ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Plate Number</TableHead>
            <TableHead>Rental Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rentals.length > 0 ? (
            rentals.map((rental) => (
              <TableRow key={rental.id}>
                <TableCell>{formatRentalId(rental.id)}</TableCell>
                <TableCell>
                  <div className="font-medium">{rental.customer_name || 'N/A'}</div>
                  <Link to="#" className="text-sm text-muted-foreground hover:underline">View Customer Details</Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{rental.vehicle?.name || "N/A"}</div>
                  <div className="text-sm text-muted-foreground">ID: {rental.vehicle?.id || "N/A"}</div>
                </TableCell>
                <TableCell>{rental.vehicle?.plate_number || "N/A"}</TableCell>
                <TableCell>{formatRentalPeriod(rental)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(rental.rental_status)}>
                    {rental.rental_status || "Unknown"}
                  </Badge>
                </TableCell>
                 <TableCell>
                  <Badge variant={getPaymentStatusVariant(rental.payment_status)}>
                    {rental.payment_status || "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {rental.total_amount?.toFixed(2) || "0.00"} MAD
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Close</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan="9" className="text-center">No rentals found.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}