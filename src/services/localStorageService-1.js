/**
 * LocalStorage Service - Mimics Firestore operations
 * Provides CRUD operations for customers and rentals using localStorage
 */

class LocalStorageService {
  constructor() {
    this.CUSTOMERS_KEY = 'app_4c3a7a6153_customers';
    this.RENTALS_KEY = 'app_4c3a7a6153_rentals';
    this.initializeData();
  }

  // Initialize with sample data if localStorage is empty
  initializeData() {
    const customers = this.getCustomers();
    const rentals = this.getRentals();

    if (customers.length === 0 && rentals.length === 0) {
      console.log('🚀 Initializing localStorage with sample data...');
      this.populateInitialData();
    }
  }

  // Sample data
  getSampleCustomers() {
    return [
      {
        id: 'customer_001',
        full_name: 'Ahmed Ben Ali',
        nationality: 'Moroccan',
        email: 'ahmed.benali@email.com',
        phone: '+212 6 12 34 56 78',
        id_number: '001',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'customer_002', 
        full_name: 'Sarah Johnson',
        nationality: 'American',
        email: 'sarah.johnson@email.com',
        phone: '+1 555 123 4567',
        id_number: '002',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'customer_003',
        full_name: 'Mohamed Alami',
        nationality: 'Moroccan',
        email: 'mohamed.alami@email.com',
        phone: '+212 6 98 76 54 32',
        id_number: '003',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'customer_004',
        full_name: 'Emma Wilson',
        nationality: 'British',
        email: 'emma.wilson@email.com',
        phone: '+44 20 7123 4567',
        id_number: '004',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'customer_005',
        full_name: 'Youssef Bennani',
        nationality: 'Moroccan',
        email: 'youssef.bennani@email.com',
        phone: '+212 6 55 44 33 22',
        id_number: '005',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  getSampleRentals() {
    return [
      // Ahmed Ben Ali - 2 Total, 1 Active, $570.00
      {
        id: 'rental_001_1',
        customerId: 'customer_001',
        vehicle: 'Toyota Camry',
        period: '7 days',
        revenue: 350,
        status: 'Active',
        pickupTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        dropoffTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rental_001_2',
        customerId: 'customer_001',
        vehicle: 'Honda Civic',
        period: '3 days',
        revenue: 220,
        status: 'Completed',
        pickupTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        dropoffTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Sarah Johnson - 1 Total, $320.00
      {
        id: 'rental_002_1',
        customerId: 'customer_002',
        vehicle: 'Nissan Altima',
        period: '5 days',
        revenue: 320,
        status: 'Completed',
        pickupTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        dropoffTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Mohamed Alami - 1 Total, 1 Active, $680.00
      {
        id: 'rental_003_1',
        customerId: 'customer_003',
        vehicle: 'BMW 3 Series',
        period: '10 days',
        revenue: 680,
        status: 'Active',
        pickupTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        dropoffTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Emma Wilson - 1 Total, $150.00
      {
        id: 'rental_004_1',
        customerId: 'customer_004',
        vehicle: 'Ford Focus',
        period: '2 days',
        revenue: 150,
        status: 'Completed',
        pickupTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dropoffTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Youssef Bennani - 2 Total, 1 Active, $1,130.00
      {
        id: 'rental_005_1',
        customerId: 'customer_005',
        vehicle: 'Mercedes C-Class',
        period: '14 days',
        revenue: 980,
        status: 'Active',
        pickupTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        dropoffTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rental_005_2',
        customerId: 'customer_005',
        vehicle: 'Audi A4',
        period: '2 days',
        revenue: 150,
        status: 'Completed',
        pickupTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        dropoffTime: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  // Populate initial data
  populateInitialData() {
    const customers = this.getSampleCustomers();
    const rentals = this.getSampleRentals();
    
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    localStorage.setItem(this.RENTALS_KEY, JSON.stringify(rentals));
    
    console.log('✅ LocalStorage populated with sample data');
    console.log(`📊 Added ${customers.length} customers and ${rentals.length} rentals`);
  }

  // Customer operations
  getCustomers() {
    const data = localStorage.getItem(this.CUSTOMERS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getCustomer(id) {
    const customers = this.getCustomers();
    return customers.find(customer => customer.id === id);
  }

  addCustomer(customer) {
    const customers = this.getCustomers();
    const newCustomer = {
      ...customer,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    customers.push(newCustomer);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    console.log('✅ Customer added:', newCustomer.full_name);
    return newCustomer;
  }

  updateCustomer(id, updates) {
    const customers = this.getCustomers();
    const index = customers.findIndex(customer => customer.id === id);
    if (index !== -1) {
      customers[index] = {
        ...customers[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
      console.log('✅ Customer updated:', customers[index].full_name);
      return customers[index];
    }
    return null;
  }

  deleteCustomer(id) {
    const customers = this.getCustomers();
    const filteredCustomers = customers.filter(customer => customer.id !== id);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(filteredCustomers));
    
    // Also delete associated rentals
    const rentals = this.getRentals();
    const filteredRentals = rentals.filter(rental => rental.customerId !== id);
    localStorage.setItem(this.RENTALS_KEY, JSON.stringify(filteredRentals));
    
    console.log('✅ Customer and associated rentals deleted');
    return true;
  }

  // Rental operations
  getRentals() {
    const data = localStorage.getItem(this.RENTALS_KEY);
    return data ? JSON.parse(data) : [];
  }

  getRental(id) {
    const rentals = this.getRentals();
    return rentals.find(rental => rental.id === id);
  }

  getRentalsByCustomer(customerId) {
    const rentals = this.getRentals();
    return rentals.filter(rental => rental.customerId === customerId);
  }

  addRental(rental) {
    const rentals = this.getRentals();
    const newRental = {
      ...rental,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    rentals.push(newRental);
    localStorage.setItem(this.RENTALS_KEY, JSON.stringify(rentals));
    console.log('✅ Rental added:', newRental.vehicle);
    return newRental;
  }

  updateRental(id, updates) {
    const rentals = this.getRentals();
    const index = rentals.findIndex(rental => rental.id === id);
    if (index !== -1) {
      rentals[index] = {
        ...rentals[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(this.RENTALS_KEY, JSON.stringify(rentals));
      console.log('✅ Rental updated:', rentals[index].vehicle);
      return rentals[index];
    }
    return null;
  }

  deleteRental(id) {
    const rentals = this.getRentals();
    const filteredRentals = rentals.filter(rental => rental.id !== id);
    localStorage.setItem(this.RENTALS_KEY, JSON.stringify(filteredRentals));
    console.log('✅ Rental deleted');
    return true;
  }

  // Utility methods
  clearAllData() {
    localStorage.removeItem(this.CUSTOMERS_KEY);
    localStorage.removeItem(this.RENTALS_KEY);
    console.log('🗑️ All data cleared from localStorage');
  }

  // Simulate real-time updates with event listeners
  onDataChange(callback) {
    const handleStorageChange = (e) => {
      if (e.key === this.CUSTOMERS_KEY || e.key === this.RENTALS_KEY) {
        callback();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}

// Create singleton instance
const localStorageService = new LocalStorageService();

export default localStorageService;