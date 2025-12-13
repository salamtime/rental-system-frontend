import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../../components/admin/adminLayout.css';

const LiveMap = () => {
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [activeTours, setActiveTours] = useState([]);
  const [selectedTour, setSelectedTour] = useState(null);
  
  // Sample active tours data
  const sampleTours = [
    {
      id: 1,
      name: 'Morning Desert Adventure',
      guide: 'Ahmed Hassan',
      participants: 8,
      startTime: '08:30',
      duration: '3 hours',
      status: 'in-progress',
      coordinates: {
        lat: 25.0657, 
        lng: 55.1713
      },
      lastUpdate: '10:15 AM'
    },
    {
      id: 2,
      name: 'Sunset Safari Experience',
      guide: 'Mohammed Ali',
      participants: 12,
      startTime: '16:00',
      duration: '4 hours',
      status: 'starting',
      coordinates: {
        lat: 25.0757, 
        lng: 55.1813
      },
      lastUpdate: '3:55 PM'
    },
    {
      id: 3,
      name: 'Dune Bashing Adventure',
      guide: 'Sara Johnson',
      participants: 6,
      startTime: '09:45',
      duration: '2.5 hours',
      status: 'in-progress',
      coordinates: {
        lat: 25.0557, 
        lng: 55.1613
      },
      lastUpdate: '11:20 AM'
    }
  ];

  useEffect(() => {
    // Simulating API call to get active tours
    const fetchActiveTours = () => {
      setTimeout(() => {
        setActiveTours(sampleTours);
        setLoading(false);
      }, 800);
    };

    // Initialize map (placeholder)
    const initializeMap = () => {
      // In a real implementation, this would initialize a mapping service like Google Maps or Mapbox
      console.log('Map initialized');
      
      // Create a mock map element for visualization
      if (mapRef.current) {
        const mapContainer = mapRef.current;
        mapContainer.innerHTML = `
          <div class="relative h-full w-full bg-blue-100 rounded-lg overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-full" style="background-image: url('/assets/images/map-placeholder.jpg'); background-size: cover; background-position: center;"></div>
            <div class="absolute top-4 right-4 bg-white p-2 rounded shadow">
              <div class="text-xs font-medium">SaharaX Tour Map</div>
            </div>
            <!-- Tour markers would be added dynamically -->
            <div class="absolute" style="top: 30%; left: 40%;">
              <div class="h-4 w-4 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div class="absolute" style="top: 50%; left: 60%;">
              <div class="h-4 w-4 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div class="absolute" style="top: 45%; left: 30%;">
              <div class="h-4 w-4 bg-yellow-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        `;
      }
    };
    
    fetchActiveTours();
    initializeMap();

    // Simulate location updates
    const updateInterval = setInterval(() => {
      setActiveTours(prev => prev.map(tour => ({
        ...tour,
        coordinates: {
          lat: tour.coordinates.lat + (Math.random() * 0.002 - 0.001),
          lng: tour.coordinates.lng + (Math.random() * 0.002 - 0.001)
        },
        lastUpdate: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      })));
    }, 30000);

    return () => clearInterval(updateInterval);
  }, []);

  const handleTourClick = (tour) => {
    setSelectedTour(tour.id === selectedTour?.id ? null : tour);
    
    // In a real implementation, this would center the map on the tour's coordinates
    console.log(`Centering map on tour ${tour.id}`);
  };

  return (
    <div className="w-full h-full max-w-full overflow-y-auto">
      <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('admin.menu.liveMap', 'Live Tour Map')}</h1>
        <p className="text-gray-600 mt-1">
          {t('admin.liveMap.subtitle', 'Track active tours and guide locations in real-time')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Active Tours List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-lg mb-4">
              {t('admin.liveMap.activeTours', 'Active Tours')}
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">{t('common.loading', 'Loading...')}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTours.length > 0 ? (
                  activeTours.map(tour => (
                    <div 
                      key={tour.id} 
                      className={`p-3 rounded-lg border cursor-pointer transition-all
                        ${selectedTour?.id === tour.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      onClick={() => handleTourClick(tour)}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-gray-800">{tour.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full
                          ${tour.status === 'in-progress' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {tour.status === 'in-progress' ? 
                            t('admin.liveMap.statusInProgress', 'In Progress') : 
                            t('admin.liveMap.statusStarting', 'Starting')}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div>{t('admin.liveMap.guide', 'Guide')}: {tour.guide}</div>
                        <div>{t('admin.liveMap.participants', 'Participants')}: {tour.participants}</div>
                        <div>{t('admin.liveMap.time', 'Time')}: {tour.startTime} ({tour.duration})</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {t('admin.liveMap.lastUpdate', 'Last update')}: {tour.lastUpdate}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button className="text-sm text-blue-600 hover:text-blue-800">
                          {t('admin.liveMap.contactGuide', 'Contact Guide')}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('admin.liveMap.noActiveTours', 'No active tours at the moment')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map Display */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-lg">
                  {selectedTour ? 
                    `${t('admin.liveMap.tracking', 'Tracking')}: ${selectedTour.name}` : 
                    t('admin.liveMap.mapView', 'Map View')}
                </h2>
                <div className="flex space-x-2">
                  <button className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded">
                    {t('admin.liveMap.refresh', 'Refresh')}
                  </button>
                  <button className="text-sm px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded">
                    {t('admin.liveMap.fullscreen', 'Fullscreen')}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Map container */}
            <div className="h-[60vh]" ref={mapRef}>
              {loading && (
                <div className="h-full flex justify-center items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                  <span className="ml-2">{t('admin.liveMap.loadingMap', 'Loading map...')}</span>
                </div>
              )}
            </div>

            {/* Map controls */}
            <div className="p-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {t('admin.liveMap.lastMapUpdate', 'Last updated')}: {new Date().toLocaleTimeString()}
              </div>
              
              <div className="flex space-x-2">
                <button className="text-sm px-3 py-1 border border-gray-300 rounded">
                  {t('admin.liveMap.satellite', 'Satellite')}
                </button>
                <button className="text-sm px-3 py-1 border border-gray-300 bg-gray-100 rounded">
                  {t('admin.liveMap.terrain', 'Terrain')}
                </button>
              </div>
            </div>
          </div>

          {/* Selected tour details */}
          {selectedTour && (
            <div className="bg-white rounded-lg shadow mt-6 p-4">
              <h3 className="font-semibold text-lg mb-3">{selectedTour.name} - {t('admin.liveMap.detailedInfo', 'Detailed Info')}</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">{t('admin.liveMap.coordinates', 'Coordinates')}</div>
                  <div className="font-medium">
                    {selectedTour.coordinates.lat.toFixed(4)}, {selectedTour.coordinates.lng.toFixed(4)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">{t('admin.liveMap.speed', 'Speed')}</div>
                  <div className="font-medium">32 km/h</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">{t('admin.liveMap.distanceTraveled', 'Distance')}</div>
                  <div className="font-medium">12.4 km</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">{t('admin.liveMap.estimatedCompletion', 'Est. Completion')}</div>
                  <div className="font-medium">11:35 AM</div>
                </div>
              </div>

              <div className="flex justify-end mt-4 space-x-3">
                <button className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                  {t('admin.liveMap.sendMessage', 'Send Message')}
                </button>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  {t('admin.liveMap.emergencyContact', 'Emergency Contact')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default LiveMap;