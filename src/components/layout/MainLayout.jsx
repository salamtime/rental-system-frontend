import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const MainLayout = ({ children }) => {
  const location = useLocation();

  // Scroll to top when navigating between pages
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <Header />
      <main className="flex-grow pt-16 sm:pt-20">
        {children}
      </main>
      <Footer />
    </>
  );
};

export default MainLayout;