import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import BookingCard from './BookingCard';
import { usePricing } from '../../contexts/PricingContext';

/**
 * Demo component for testing BookingCard with different tour options
 */
const BookingCardsDemo = () => {
  const { pricingEnabled, togglePricingEnabled } = usePricing();
  
  // Sample tour data
  const sampleTours = [
    {
      id: 1,
      name: "City Explorer Tour",
      price: 65,
      duration: "1 hour",
      location: "Downtown",
      maxParticipants: 2,
      type: "city",
      description: "Explore the vibrant city center with our guided tour."
    },
    {
      id: 2,
      name: "Mountain Adventure",
      price: 120,
      duration: "2 hours",
      location: "Mountain Base",
      maxParticipants: 2,
      type: "mountain",
      description: "Experience the thrill of mountain trails with stunning views."
    },
    {
      id: 3,
      name: "Daily Rental",
      price: 200,
      duration: "8 hours",
      location: "Rental Center",
      maxParticipants: 2,
      type: "daily-rental",
      description: "Rent a quad for the entire day and explore at your own pace."
    }
  ];
  
  const [bookingDetails, setBookingDetails] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  const handleBookingSubmit = (details) => {
    toast.success('Booking details captured!');
    setBookingDetails(details);
    setShowBookingModal(true);
  };
  
  const handleEditTour = (tour) => {
    toast.info(`Edit tour: ${tour.name}`);
  };
  
  const handleDeleteTour = (tour) => {
    toast.error(`Delete tour: ${tour.name}`);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tour Booking Demo</h1>
            <p className="text-gray-600">Test the BookingCard component with dynamic pricing</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              Dynamic Pricing:
            </span>
            <button
              onClick={togglePricingEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                pricingEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pricingEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {sampleTours.map((tour) => (
            <BookingCard
              key={tour.id}
              tour={tour}
              onBookingSubmit={handleBookingSubmit}
              onEditTour={handleEditTour}
              onDeleteTour={handleDeleteTour}
              showAdminActions={true}
            />
          ))}
        </div>
        
        {/* Booking Details Modal */}
        {showBookingModal && bookingDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Booking Details</h2>
                <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(bookingDetails, null, 2)}
                </pre>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="mt-4 w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCardsDemo;