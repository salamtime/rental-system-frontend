import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import '../../components/admin/adminLayout.css';

const TourHistory = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tours, setTours] = useState([]);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchGuide, setSearchGuide] = useState('');
  const { userRoles } = useSelector((state) => state.auth);
  
  // Sample tour history data
  const sampleTourHistory = [
    {
      id: 1,
      name: 'Morning Desert Adventure',
      date: '2023-06-10',
      startTime: '08:30',
      endTime: '11:45',
      guide: 'Ahmed Hassan',
      participants: 8,
      vehicleCount: 8,
      distance: 42,
      status: 'completed',
      revenue: 1200,
      notes: 'Perfect weather conditions, all customers were satisfied',
      rating: 4.8,
    },
    {
      id: 2,
      name: 'Sunset Safari Experience',
      date: '2023-06-12',
      startTime: '16:00',
      endTime: '20:15',
      guide: 'Mohammed Ali',
      participants: 12,
      vehicleCount: 12,
      distance: 56,
      status: 'completed',
      revenue: 1800,
      notes: 'One ATV had a minor issue but was quickly fixed',
      rating: 4.5,
    },
    {
      id: 3,
      name: 'Advanced Dunes Trail',
      date: '2023-06-14',
      startTime: '09:30',
      endTime: '13:20',
      guide: 'Sara Johnson',
      participants: 6,
      vehicleCount: 6,
      distance: 38,
      status: 'completed',
      revenue: 1050,
      notes: 'Group requested more challenging trails',
      rating: 4.9,
    },
    {
      id: 4,
      name: 'Oasis Discovery Tour',
      date: '2023-06-15',
      startTime: '08:00',
      endTime: '12:30',
      guide: 'Ahmed Hassan',
      participants: 10,
      vehicleCount: 10,
      distance: 48,
      status: 'completed',
      revenue: 1500,
      notes: 'Stopped at the oasis for refreshments',
      rating: 4.7,
    },
    {
      id: 5,
      name: 'Moonlight Desert Safari',
      date: '2023-06-16',
      startTime: '19:00',
      endTime: '22:45',
      guide: 'Mohammed Ali',
      participants: 8,
      vehicleCount: 8,
      distance: 35,
      status: 'completed',
      revenue: 1600,
      notes: 'Special night tour with stargazing',
      rating: 5.0,
    },
    {
      id: 6,
      name: 'Beginner Desert Training',
      date: '2023-06-17',
      startTime: '10:00',
      endTime: '12:30',
      guide: 'Sara Johnson',
      participants: 4,
      vehicleCount: 4,
      distance: 22,
      status: 'completed',
      revenue: 600,
      notes: 'Focus on safety and basic techniques',
      rating: 4.6,
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchTourHistory = () => {
      setTimeout(() => {
        setTours(sampleTourHistory);
        setLoading(false);
      }, 800);
    };

    fetchTourHistory();
  }, []);

  // Filter tours based on selected filter
  const filteredTours = tours
    .filter(tour => {
      if (filter === 'all') return true;
      return tour.status === filter;
    })
    .filter(tour => {
      // Filter by guide name
      if (!searchGuide) return true;
      return tour.guide.toLowerCase().includes(searchGuide.toLowerCase());
    })
    .filter(tour => {
      // Filter by date range
      if (!dateRange.start && !dateRange.end) return true;
      
      const tourDate = new Date(tour.date);
      const startDate = dateRange.start ? new Date(dateRange.start) : new Date(0);
      const endDate = dateRange.end ? new Date(dateRange.end) : new Date(8640000000000000); // Max date
      
      return tourDate >= startDate && tourDate <= endDate;
    });

  const calculateTotals = () => {
    return filteredTours.reduce(
      (acc, tour) => {
        acc.participants += tour.participants;
        acc.revenue += tour.revenue;
        acc.distance += tour.distance;
        return acc;
      },
      { participants: 0, revenue: 0, distance: 0 }
    );
  };

  const totals = calculateTotals();
  const averageRating = filteredTours.length 
    ? (filteredTours.reduce((sum, tour) => sum + tour.rating, 0) / filteredTours.length).toFixed(1) 
    : 0;

  return (
    <div className="w-full h-full max-w-full overflow-y-auto">
      <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('admin.menu.tourHistory', 'Tour History')}</h1>
        <p className="text-gray-600 mt-1">
          {t('admin.tourHistory.subtitle', 'View past tours and analyze performance')}
        </p>
      </div>

      {/* Filter controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.tourHistory.filterStatus', 'Filter by Status')}
            </label>
            <select
              id="status-filter"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">{t('admin.common.all', 'All')}</option>
              <option value="completed">{t('admin.tourHistory.statusCompleted', 'Completed')}</option>
              <option value="cancelled">{t('admin.tourHistory.statusCancelled', 'Cancelled')}</option>
            </select>
          </div>

          <div>
            <label htmlFor="search-guide" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.tourHistory.filterGuide', 'Search Guide')}
            </label>
            <input
              type="text"
              id="search-guide"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={searchGuide}
              onChange={(e) => setSearchGuide(e.target.value)}
              placeholder={t('admin.tourHistory.searchGuidePlaceholder', 'Enter guide name')}
            />
          </div>

          <div>
            <label htmlFor="date-start" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.tourHistory.dateStart', 'Start Date')}
            </label>
            <input
              type="date"
              id="date-start"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="date-end" className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin.tourHistory.dateEnd', 'End Date')}
            </label>
            <input
              type="date"
              id="date-end"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('admin.tourHistory.totalTours', 'Total Tours')}</div>
          <div className="text-2xl font-bold text-gray-900">{filteredTours.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('admin.tourHistory.totalParticipants', 'Total Participants')}</div>
          <div className="text-2xl font-bold text-gray-900">{totals.participants}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('admin.tourHistory.totalRevenue', 'Total Revenue')}</div>
          <div className="text-2xl font-bold text-gray-900">${totals.revenue}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">{t('admin.tourHistory.averageRating', 'Average Rating')}</div>
          <div className="text-2xl font-bold text-gray-900">
            {averageRating} / 5.0
            <span className="text-yellow-500 ml-2">
              {'★'.repeat(Math.round(averageRating))}
              {'☆'.repeat(5 - Math.round(averageRating))}
            </span>
          </div>
        </div>
      </div>

      {/* Tours Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">{t('common.loading', 'Loading...')}</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.tourHistory.tourName', 'Tour Name')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.tourHistory.date', 'Date')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.tourHistory.guide', 'Guide')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.tourHistory.participants', 'Participants')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.tourHistory.distance', 'Distance (km)')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.tourHistory.revenue', 'Revenue')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.tourHistory.rating', 'Rating')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin.common.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTours.map((tour) => (
                  <tr key={tour.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tour.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tour.date} ({tour.startTime} - {tour.endTime})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tour.guide}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tour.participants}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tour.distance}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${tour.revenue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <span className="mr-1">{tour.rating}</span>
                        <span className="text-yellow-500">{'★'.repeat(Math.round(tour.rating))}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">
                        {t('admin.common.view', 'View')}
                      </button>
                      <button className="text-gray-600 hover:text-gray-900">
                        {t('admin.common.download', 'Download')}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTours.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                      {t('admin.tourHistory.noToursFound', 'No tours found matching the selected filters')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Export controls */}
      <div className="flex justify-end mt-6">
        <button className="ml-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          {t('admin.common.exportCSV', 'Export CSV')}
        </button>
        <button className="ml-3 px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          {t('admin.tourHistory.generateReport', 'Generate Report')}
        </button>
      </div>
      </div>
    </div>
  );
};

export default TourHistory;