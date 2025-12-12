import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Rentals = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const vehicles = [
    {
      id: 1,
      name: "Yamaha Raptor 700R",
      category: "sport",
      engine: "686cc",
      transmission: "Manual",
      seats: 1,
      hourlyRate: 45,
      dailyRate: 280,
      image: "/assets/images/vehicles/raptor-700r.jpg",
      features: ["High Performance", "Sport Suspension", "Racing Tires", "Digital Display"],
      availability: "available"
    },
    {
      id: 2,
      name: "Honda TRX450R",
      category: "sport",
      engine: "449cc",
      transmission: "Manual",
      seats: 1,
      hourlyRate: 40,
      dailyRate: 250,
      image: "/assets/images/vehicles/trx450r.jpg",
      features: ["Lightweight", "Responsive Handling", "Sport Quad", "Quick Acceleration"],
      availability: "available"
    },
    {
      id: 3,
      name: "Can-Am Outlander 570",
      category: "utility",
      engine: "570cc",
      transmission: "CVT",
      seats: 2,
      hourlyRate: 50,
      dailyRate: 320,
      image: "/assets/images/vehicles/outlander-570.jpg",
      features: ["2-Seater", "Cargo Rack", "4WD", "Comfortable Ride"],
      availability: "available"
    },
    {
      id: 4,
      name: "Polaris RZR 900",
      category: "side-by-side",
      engine: "875cc",
      transmission: "CVT",
      seats: 2,
      hourlyRate: 65,
      dailyRate: 420,
      image: "/assets/images/vehicles/rzr-900.jpg",
      features: ["Side-by-Side", "Roll Cage", "High Ground Clearance", "Adventure Ready"],
      availability: "rented"
    },
    {
      id: 5,
      name: "Kawasaki Brute Force 750",
      category: "utility",
      engine: "749cc",
      transmission: "CVT",
      seats: 1,
      hourlyRate: 48,
      dailyRate: 300,
      image: "/assets/images/vehicles/brute-force-750.jpg",
      features: ["Heavy Duty", "Towing Capacity", "4WD", "Durable Build"],
      availability: "maintenance"
    },
    {
      id: 6,
      name: "Arctic Cat Wildcat XX",
      category: "side-by-side",
      engine: "1000cc",
      transmission: "CVT",
      seats: 2,
      hourlyRate: 75,
      dailyRate: 480,
      image: "/assets/images/vehicles/wildcat-xx.jpg",
      features: ["High Performance", "Long Travel Suspension", "Racing Inspired", "Premium Interior"],
      availability: "available"
    }
  ];

  const categories = [
    { id: 'all', name: 'All Vehicles' },
    { id: 'sport', name: 'Sport ATVs' },
    { id: 'utility', name: 'Utility ATVs' },
    { id: 'side-by-side', name: 'Side-by-Side' }
  ];

  const filteredVehicles = selectedCategory === 'all' 
    ? vehicles 
    : vehicles.filter(vehicle => vehicle.category === selectedCategory);

  const getAvailabilityStatus = (availability) => {
    switch (availability) {
      case 'available':
        return { text: 'Available', color: 'text-green-600 bg-green-100' };
      case 'rented':
        return { text: 'Currently Rented', color: 'text-red-600 bg-red-100' };
      case 'maintenance':
        return { text: 'Under Maintenance', color: 'text-yellow-600 bg-yellow-100' };
      default:
        return { text: 'Unknown', color: 'text-gray-600 bg-gray-100' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            ATV Rentals
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">
            Choose from our premium fleet of ATVs and side-by-side vehicles for your desert adventure
          </p>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Vehicles Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVehicles.map(vehicle => {
              const status = getAvailabilityStatus(vehicle.availability);
              return (
                <div key={vehicle.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  {/* Vehicle Image */}
                  <div className="h-48 bg-gradient-to-r from-green-400 to-blue-400 flex items-center justify-center relative">
                    <span className="text-white font-medium">Vehicle Image</span>
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.text}
                    </div>
                  </div>

                  {/* Vehicle Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{vehicle.name}</h3>

                    {/* Pricing */}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <span className="text-2xl font-bold text-green-600">${vehicle.hourlyRate}</span>
                        <span className="text-gray-500 text-sm">/hour</span>
                      </div>
                      <div>
                        <span className="text-lg font-semibold text-blue-600">${vehicle.dailyRate}</span>
                        <span className="text-gray-500 text-sm">/day</span>
                      </div>
                    </div>

                    {/* Vehicle Specs */}
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Engine:</span>
                        <span className="font-medium">{vehicle.engine}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Transmission:</span>
                        <span className="font-medium">{vehicle.transmission}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Seats:</span>
                        <span className="font-medium">{vehicle.seats} person{vehicle.seats > 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-2 text-sm">Features:</h4>
                      <div className="flex flex-wrap gap-1">
                        {vehicle.features.map((feature, index) => (
                          <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      {vehicle.availability === 'available' ? (
                        <Link
                          to={`/rental-booking/${vehicle.id}`}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-center font-medium"
                        >
                          Rent Now
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="flex-1 bg-gray-400 text-white py-2 px-4 rounded-md cursor-not-allowed text-center font-medium"
                        >
                          Not Available
                        </button>
                      )}
                      <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Rental Information */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Rental Information
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Flexible Hours</h3>
              <p className="text-gray-600 text-sm">
                Rent by the hour or full day with flexible pickup and return times
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Safety Equipment</h3>
              <p className="text-gray-600 text-sm">
                All rentals include helmets, goggles, and safety briefing
              </p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Fuel Included</h3>
              <p className="text-gray-600 text-sm">
                Full tank provided with every rental, no extra fuel charges
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">24/7 Support</h3>
              <p className="text-gray-600 text-sm">
                Emergency support and roadside assistance available anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
              Rental Requirements
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">What You Need</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Valid driver's license (18+ years)
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Credit card for security deposit
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Safety briefing completion
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Signed waiver and rental agreement
                  </li>
                </ul>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">What's Included</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Safety helmet and goggles
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Full tank of fuel
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic insurance coverage
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Emergency contact support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Hit the Desert?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Choose your perfect ATV and start your desert adventure today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-white text-green-600 px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Us
            </Link>
            <Link
              to="/tours"
              className="border-2 border-white text-white px-8 py-3 rounded-md font-semibold hover:bg-white hover:text-green-600 transition-colors"
            >
              Guided Tours
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Rentals;