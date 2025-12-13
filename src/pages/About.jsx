import React from 'react';
import { useTranslation } from 'react-i18next';

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About SaharaX
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">
            Your premier destination for desert adventures in Morocco
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                Our Story
              </h2>
              <p className="text-gray-600 mb-4">
                Founded in 2020, SaharaX has been providing unforgettable desert adventures 
                to travelers from around the world. We specialize in ATV rentals and guided 
                tours through Morocco's stunning Sahara Desert.
              </p>
              <p className="text-gray-600 mb-4">
                Our team of experienced guides and mechanics ensures that every adventure 
                is safe, exciting, and memorable. We pride ourselves on our high-quality 
                equipment and exceptional customer service.
              </p>
              <p className="text-gray-600">
                Whether you're seeking an adrenaline-pumping solo ride or a guided tour 
                with friends and family, we have the perfect adventure waiting for you.
              </p>
            </div>
            <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
              <span className="text-gray-500">Desert Adventure Image</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Our Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Safety First</h3>
              <p className="text-gray-600">
                Your safety is our top priority. All our equipment is regularly maintained 
                and our guides are certified professionals.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Passion</h3>
              <p className="text-gray-600">
                We're passionate about the desert and love sharing its beauty and 
                excitement with our customers.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Adventure</h3>
              <p className="text-gray-600">
                Every journey with us is an adventure. We create experiences that 
                you'll remember for a lifetime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Meet Our Team
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-gray-300 w-32 h-32 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Ahmed Hassan</h3>
              <p className="text-blue-600 mb-2">Founder & Lead Guide</p>
              <p className="text-gray-600 text-sm">
                With over 15 years of desert experience, Ahmed founded SaharaX to share 
                his love for the Sahara with the world.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gray-300 w-32 h-32 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Fatima Al-Zahra</h3>
              <p className="text-blue-600 mb-2">Operations Manager</p>
              <p className="text-gray-600 text-sm">
                Fatima ensures every detail of your adventure is perfectly planned 
                and executed with precision.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-gray-300 w-32 h-32 rounded-full mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Omar Benali</h3>
              <p className="text-blue-600 mb-2">Chief Mechanic</p>
              <p className="text-gray-600 text-sm">
                Omar keeps our fleet in perfect condition, ensuring safe and reliable 
                adventures for all our customers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;