import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Hero from '../components/Hero/Hero';
import PopularServices from '../components/PopularServices/PopularServices';
import WhyChoose from '../components/WhyChoose/WhyChoose';
import HowItWorks from '../components/HowItWorks/HowItWorks';
import Testimonials from '../components/Testimonials/Testimonials';
import PartnerCTA from '../components/PartnerCTA/PartnerCTA';

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const j = localStorage.getItem('user');
      if (j) navigate('/dashboard');
    } catch (e) {
      // ignore
    }
  }, [navigate]);

  return (
    <>
      <Hero />
      <PopularServices />
      <WhyChoose />
      <HowItWorks />
      <Testimonials />
      <PartnerCTA />
    </>
  );
};

export default Home;
